Safety Manual
The aim of this chapter is to provide the user with all the recommendations and best practices to be applied when using GRIF software, in the context of developing systems subject to the functional safety requirements of IEC 61508. This safety manual is a requirement for software certification, and must be strictly respected in order to guarantee the validity of the results produced by GRIF in critical applications.

User responsibility
Input control: GRIF does not perform a complete validation of values entered by the user. It is the user's responsibility to ensure that input data are consistent, realistic and appropriate to the study context. The user must avoid any implicit assumptions that could lead to modeling errors not automatically detected by the software.

Training: As stated in IEC61508-1, req 6.2.13, users must have appropriate skills to intervene in the life cycle of safety instrumented functions. Before using the software, users must ensure that they have the necessary skills to use the software, and in particular they must know and understand all the parameters that may affect the results.

Verification of results
Plausibility of results: Users must systematically check that the results provided by GRIF are plausible in relation to the input data and their business expertise. Inconsistency may indicate a modeling error or software malfunction.

Model sensitivity: When changing parameters (e.g. failure rate, architecture, lead times, ...), results are expected to vary consistently. A lack of variation or a counter-intuitive variation should be investigated.

Version comparison: When updating GRIF, it is mandatory to compare the results obtained with those of the previous version on the same input model, in order to detect any unjustified changes. To do this, open the old document with the new version, then "save as", indicating a name suffixed with the current version. Then reopen the new file with the new version, run the calculations and check that the results are identical to those of the previous software version.

Curve analysis: When a curve represents the evolution of a result (failure rate, probability, unavailability, etc.), the user must check that:

the discontinuities appear at the expected instants,

the variation trend is consistent with the physical or logical behaviors of the system under study.


Consistency between graphical results and numerical values: Values displayed in reports (summary panels, exports, tables) must be compatible with those visible on the curves and model. Any contradiction must be reported as an anomaly.

Software integrity
Identification of the version used: To ensure traceability and reproducibility of results, the user must check the exact version of GRIF used, including:

the version number, available in the "About"

menu
the SHA or digital signature or in the software's system information.


Secure download: GRIF must be downloaded exclusively from the official website or a channel validated by the publisher. The SHA fingerprint of each version can be downloaded on the following webpage https://grif.totalenergies.com/en/services/customer-service/telecharger-grif .

Configuration files and customization
.ini files: Configuration files generated automatically by GRIF must not be modified manually under any circumstances. Any modification outside the scope of this manual may compromise the validity of the results and fall outside the scope of certification. Any customization of the software must be carried out via the interface provided.

In case of doubt or anomaly
Bug detection or unexpected behavior: If a user identifies an inconsistency, a suspicious result or abnormal behavior of the software, he should save his model and contact his reseller following the procedure indicated in the installation manual.

Anomaly management: Each justified request will be the subject of a ticket opening in the anomaly management system is in place to analyze and correct malfunctions.

General recommendations
Carry out cross-reviews of models and results with peers. Systematically document all modeling assumptions. Archive project files with their associated software version for any use in evaluation or auditing. Stop using the software as soon as you see a message asking you to ?contact your reseller?. This message means that an unknown error has occurred which has not been dealt with by the software, and that you should contact your reseller following the procedure detailed in the installation manual.

Known limits
Computer resources: like all scientific calculation software, calculation times and even feasibility may depend on the complexity of the models and the performance of the computers used. In all modules of the Boolean package, the amount of memory is a limiting factor. If the ?BDD creation? calculation phase takes too long or is unsuccessful, it may be necessary to increase the amount of memory allocated to GRIF and its Albizia calculation engine.

Model size: For the sensor part, the limit is 16 channels of 24 sensors. For the actuator part, the limit is 24 channels of 8 actuators. Only a single solver component can be modeled.

File size: a GRIF file may not exceed a size of 4 GB, which means that all models + attached files + images + results must not exceed this limit. Be careful, therefore, with attachment sizes, as well as with ?calculation steps? that are too small and produce too many points, such as a test every second over 40 years, which would generate a gigantic file.

File naming and location: file names must not contain special characters other than '-' and '_'. The path to the directory containing GRIF files must also not contain any special characters. Files must be stored on a local drive (which may correspond to a network location).

Java environment and operating system: GRIF is guaranteed to work only on the version of Java and operating systems listed in the installation manual.

Presentation
Introduction
The SIL module in the GRIF software platform enables instrument technicians in charge of architecture design or maintenance of SIS (Safety Instrumented System) to evaluate the SIL (Safety Integrity Level) of safety instrumented loops in line with standards IEC 61508 and 61511. The computations carried out are safety computations; the top event is a non-detected dangerous failure of the SIS (Safety Instrumented System) safety function.

The definitions and parameters used in this document are explained in the glossary (cf. Appendix E, Glossary)

This module uses ALBIZIA, the BDD (Binary Decision Diagram) computation engine developed by TotalEnergies. ALBIZIA offers the advantage of running accurate analytical computations and providing extensive information on the system under study. The computations of probabilities and frequencies are certified by INERIS. The certificate is available in PDF format inside the GRIF202X/Bin/Tools/Albizia folder.

Main window of the SIL module
The main window is divided into several parts:

Title bar: The title bar shows the names of the module and file being edited.

Menu bar: The menu bar gives access to all the application's functions.

Icon bar (shortcuts): The shortcut bar is an icon bar (horizontal) which gives faster access to the most common functions. The Operating duration area lets you specify the operating duration in years, and launch computation.

Tool bar: The tool bar (vertical) enables you to select the elements for modeling. By default, this tool bar is not displayed. In order to make it visible, check the box Display graphical tools bar in Tools.

Input zone: A maximum amount of space has been left for the graphical input zone for creating the model. When module is launched, this zone contains a picture representing the architecture as well as an empty chart as no computations have yet been carried out.

Tree: Graphical tree is between input zone and tool bar. It enables to walk through pages and groups of the document. It is not displayed by default.

Configuration window: On the right of input zone, a window that contains Configuration of architecture, Configuration of components, Report, « The parameters » and « Attributes » enables you to configure the system.




Vertical toolbar
All the graphical symbols are shown on the vertical icon bar on the left of the data input screen. This toolbar is not visible by default, it can be displayed with the Tools menu.




The vertical toolbar contains the following items:

Select selects the desired elements.

Group to create a new group. A group is a sub-page which can contains graphics elements.

Comment to add text directly to the graphic.

Charts to draw charts representing computations on the model.

SIL edit modes
SIL module have 2 edit modes possible.

Default mode enables to use SIL module with more options.

Simple mode enables to use SIL module easier (especially in the configuration of the components) and faster.

The choice of edit mode is made inTools menu then Document options.



The default edit mode is explained in the chapters « The default mode ».

The default edit mode is explained in the chapter « The simplified mode ».

Configuration of architecture
The Configuration of architecture tab enables to define architecture. Each modification made on this tab is visible on picture of architecture.




Architecture definition
The top part of the tab: Configuration of architecture enables to define the configuration of sensor part. Possible choices are:

The number of channels, up to 16, and the (logical) configuration between channels (cf. );

Number of components in each channel, up to 24, and the configuration of these components in the channel;

Taking Common Cause failure into account for all sensors (cf. );

Taking Common Cause failure into account for sensors of a channel.

The bottom of Configuration of architecture tab enables to define the configuration of sensor part. Possible choices are:

The number of channels, up to 24, and the (logical) configuration between channels (cf. ).

Number of actuators in each channel, up to 8, and the configuration of these components in the channel.

For each actuator, the number of sub-actuators (0, 1, or 2), and the configuration of these sub-actuators.

Taking Common Cause failure into account for all actuators. (cf. )

Taking Common Cause failure into account for actuators and sub-actuator of the channel.

Taking Common Cause failure into account for sub-actuators of the actuator.


Warning
In case of parallel and redundant architecture, a warning appears if user does not indicate common cause failures.

Warning
In case of in series architecture, a warning appears if user indicates common cause failures.

Use of graphical input zone
It is possible to remove, add a channel or modify redundancy of channel using graphical input zone of safety instrumented loops. A right click on the ellipse makes it possible to add or remove a channel. In this case, the last channel will be removed.

A right click on channel number removes the specific channel.




Voting for components of a channel
Usually, for each channel, a MooN voting means that you need M components at threshold (detecting problem) to trip (put the system under control in a safe mode). For sensors, the SIL module distinguish MooNS (Safety) and MooNA(Availability) voting.


Vote with "S" type architecture: the invalidity of the sensor triggers the safety system (Safe).




Vote with "A" type architecture: the invalidity of the sensor triggers no action other than an alarm (availability). The solver logic is modified, excluding sensors with detected failure. In this case, we define a number (X) of detected failure from which the channel trips. This number (X) is fixed by default for TotalEnergies (but can be modified in M configuration):

3 if 3 components or more
2 if 2 components
1 if 1 component




Vote with "M" type architecture: It is exactly the same definition as type "A". But X (the number of detected failure leading to trip) can be modified by users.



The reconfigurations in A/M configuration are the following:

1oo3 -> 1oo2 -> 1oo1
2oo3 -> 1oo2 -> 1oo1
3oo3 -> 2oo2 -> 1oo1
MooN -> Moo(N-1)-> Moo(N-2) etc while N-i > M, then M and N are decreased of 1 until 2oo3 configuration
NooN -> (N-1)oo(N-1) etc until 1oo1
Example: 4oo8 -> 4oo7 -> 4oo6 -> 4oo5 -> 3oo4 -> 2oo3

Following chapters detail S and A configuration for 1oo2 and 2oo3.

1oo2S and 1oo2A



2oo3S



2oo3A



Configuration of channels of a part
You can select a MooN (M out of N) configuration, in this case, the system needs M working sub-systems (out of N) to be available for its safety function. You can also choose a specific configuration. For example, if you need to configure 3 channels as follows: channel1 OR (channel2 AND channel3), select the manual button and type: (1 | (2 & 3)) in the text field. In formula, each channel is replaced by its number. For logical OR, use pipe (|) character. For AND use &. Operators have different priority, you must use parenthesis.

Take Common Cause Failures into account
You can use Common Cause Failures (CCF) at different levels of architecture. For each level, you can specify a beta-factor. For expert-users, you can display the DDC period configuration (with Tools ), it let you specify a period (in hour) for CCF test. This period is automatically calculated. Uncheck the period checkbox if and only if you really know what you do.

Constraints on SIF architecture
The architectural constraints are defined by IEC61508 and 61511 standards to limit the maximum SIL that can be achieved according to the Hardware Fualt Tolerence and caracteristics of components. This mximum SIL is independent from PFD and PFH. The architectural constraints differ according to the standard. This chapter summarizes the various architectural constraints of a safety instrumented function according to the standard.

Definition
Please refer to standard for more details. Only small extracts are listed in next chapters.

SFF : Safe Falure Fraction

HFT : Hardware Fault Tolerence

Field proven/Standard/Non-safety: The previoux IEC61511 (2003) defined caracteristics (positiv safety/fild proven/certified etc ...) that was necessary for maximum SIL computation. Theses differences have been removed from computation in 2016.

Type A : Type A component (see IEC 61508)

Type B Type B component (see IEC 61508)

IEC 61508: Route 1H
According to Chapter 7.4.4.2 of IEC 61508-2, the following table define the maximum reachable SIL depending on the number of hardware faults that are acceptable, and depending on the Safe Failure Fraction.

Type A:

IEC 61508: Route 2H
According to Chapter 7.4.4.3 of IEC 61508-2, the following table define the maximum reachable SIL depending on the hardware faults tolerance is:



IEC 61508: Route 2H - Chap 7.4.4.3.2
«For type A elements only, if it is determined that by following the HFT requirements specified in IEC 61508-2 chapter 7.4.4.3.1, for the situation where an HFT greater than 0 is required, it would introduce additional failures and lead to a decrease in the overall safety of the EUC, then a safer alternative architecture with reduced HFT may be implemented. In such a case this shall be justified and documented. The justification shall provide evidence that:

a) compliance with the HFT requirements specified in 7.4.4.3.1 would introduce additional failures and lead to a decrease in the overall safety of the EUC; and

b) if the HFT is reduced to zero, the failure modes, identified in the element performing the safety function, can be excluded because the dangerous failure rate(s) of the identified failure mode(s) are very low compared to the target failure measure for the safety function under consideration (see 7.4.4.1.1 c)). That is, the sum of the dangerous failure frequencies of all serial elements, on which fault exclusion is being claimed, should not exceed 1 % of the target failure measure. Furthermore the applicability of fault exclusions shall be justified considering the potential for systematic faults»


If HFT ≥ 1 ⇒ SIL 4;
If HFT = 0 ⇒ SIL 3;

IEC 61511 - Version 2016
Minimum HFT requirements according to SIL


IEC 61511 - Version 2016 - Chap 11.4.6
For a SIS or SIS subsystem that does not use FVL or LVL programmable devices and if the minimum HFT as specified in Table 6, would result in additional failures and lead to decreased overall process safety, then the HFT may be reduced. This shall be justified and documented. The justification shall provide evidence that the proposed architecture is suitable for its intended purpose and meets the safety integrity requirements.


If HFT ≥ 1 ⇒ SIL 4;
If HFT = 0 ⇒ SIL 3;

How to configure the standard that will be used for contraints
You can choose the standard used to compute the maximum SIL in the Data and computations/Applied standard for contraints menu. This choice will be applied to every loop of the document, for sensor part and actuator part.

If you want to specify a specific standard pour each part of a loop, you can activate the Data and computations/Configure specific standards in the parts option. In this case, the architectural tab will contain a Specific standard in the part area, which can be used to define a specific standard for each part.
Configuration of components
The aim is to specify values for each element of the SIF being studied.

Do this with the tabs of configuration window:

The Sensor(s) tab is used to configure the sensors,
The Solver tab is used to configure the solver,
The Actuator(s) tab is used to configure the actuators


Note
In the following chapters, all the numerical values entered can be real numbers, where the decimal separator is a dot. It is possible to write them as such: 0.0000015 or in scientific notation: 1.5E-6

Configuring the sensors
The sensors of the safety loop can be configured in the Configuration of components/Sensor(s) Part tab. Each sensor can be accessed separately in the sub-tabs S1.1, S1.2, etc. The first number (before the dot) is the channel number, the second (after the dot) is the position in the channel.

Configuration of sensors is also accessible by a double click in the input zone on the sensor which user want to set up.



Note
In the following paragraph, "the component" means the sensor.

Existing component
The component may be already used/defined somewhere else in the system. In this case we speak about existing component. For example, when a component is in 2 channels. The existing component can be selected in a list. It can be a component of the current SIF, of one of another SIF. This options is only available when you have many components of the same type.

Identification
Tag name : component's instrument tag on PID (e.g.: 10 PT 2034 for a sensor, 10 UV 2034 for an actuator, or 10_ESD_06 for solver).

Near to Tag name two icons enables you to export or import parameters from a xml file or from a database.

Import/Export components properties in xml format  Six actions can be chosen from the drop-down menu, displayed with a left click on the button:



Save as default model : saves the component's characteristics in the default model.

Re-initialise to default values : copies into the component the characteristics stored in the default model.

Save in a model file : saves the component's characteristics in a model file, whose location must be specified. This file can be reused or sent to another person.

Use a model : copies into the component the characteristics stored in a model whose location must be specified. The name of the file where the model is located will be displayed at the left of the button.

Connect to a model file : enables to connect a component to a model of a component stored in a database, whose location must be specified.

Disconnect to a model file : disconnect the component to the model file.


Base of components  By clicking on the icon 3 actions are available.



Use a component : copies into the component the characteristics stored in the base of components.

Connect a component : connect the component to a component stored in the base of components. The name of the file where the component is located will be displayed at the left of the button.

Disconnect a component : disconnect a component in the base of components.


Identical to : used to specify whether the component is identical to another component of the same type (i.e. a sensor when editing a sensor).

By clicking on the following icon  it is possible to copy another component's parameters.

This functionality can only be accessed when the SIF have several components of the same type. Only the characteristics Tag and Identical to are not copied. The components available are the same as those displayed for the functionality Identical to.


Warning
It is different from Existing component. Here the component is not exactly the selected one, they are physically distinct, but they have same parameters. This functionality can only be accessed when the SIF have several components of the same type. If the checkbox is checked, only the Tag of the component can be edited (the others are identical to the reference component).

Instrument category : category of instrument used and enables a better categorization of the sensors and actuator. They are selected from one drop-down menu. For sensor :


For actuators :



Instrument type : type of instrument used. They are selected from one drop-down menu. This list is updated regularly

Manufacturer : inform the manufacturer of the component.

Data source : Indicate where reliability data are extracted.

Description : open field where the user can add his own description of the component.


Caution
In the base of components, these information are filled in the following columns:

ID

REPERE

DESCRIPTION

INSTRUMENTED_TYPE:All the components type are given in the Appendix C, List of components

MANUFACTURER

DATA_SOURCE



Determined character of the component
Determined character of the component : enables you to specify the component's determined character. The component is characterised by one of the three characters available:

Non-type A/B : indicates that the component is operating in negative safety mode (energies to trip) and without self-diagnostic system. Corresponds to the NS type (Non-safety component) of versions previous to 2013.

Type B : indicates that the component is operating in positive safety mode (fail-safe) or equipped with a self-diagnostic system. Corresponds to the S type (Standard component) of versions previous to 2013.

Type A : indicates that the component is operating in positive safety mode (fail-safe) and proven in use (or certified) and equipped with a self-diagnostic system (or implementation of several proof test) and access protected safeguarding the settings of the internal configuration parameters. Corresponds to the F type (Field proven component) of versions previous to 2013.


Caution
In the base of components, these information are filled in the DETERMINED_CHARACTER column:

NS for No-type A/B component;
S for type B component;
F for type A component;


Test
Test type: enables you to specify the type of test used for the component. Two types of test can be selected from the drop-down menu:

Test when unit is stopped: means that the component is tested when the unit is stopped. The test does not harm the safety function as the unit is no longer working.

Test when unit is working: means that the component is tested when the unit is working. The component is no longer available to carry out its function and this affects the safety function. This can be used when a sensor has been by-passed to be tested and the installation has not been stopped.


Note
it is also possible to specify that the component will undergo no periodic test.

Duration between tests (T1): period of time between two proof tests of the component. The time unit is selected from a drop-down list (hours, days, months, years).

Time of the first test (T0): time at which the first test of the component is carried out. The modes for editing this characteristic (value and unit) are the same as for the duration between tests.


Caution
In the base of components, these information are filled in the following columns:

TEST_TYPE:

TESTUNITWORK pour Test unité en marche;
TESTUNITSTOP pour Test unité à l'arrêt;
EXP pour Non testé;

T0: Fist test;

T0_UNIT: HOUR, DAY, MONTH or YEAR;

T1:Duration between tests;

T1_UNIT:: HOUR, DAY, MONTH or YEAR.



Instrument parameters
This part includes all reliability data for a component.

For failure rates 2 different ways can be used to inform them:

Simple way: with the following parameters:



Note
The value can be edited manually or selected from a drop-down list dusing automatic completion.
Lambda λ: failure rate of the component (h-1).

LambdaD/Lambda (λd/λ): proportion of dangerous failures among the total number of failures.

DCd: on-line diagnostic coverage of dangerous failures and is a rate between 0 and 100%. A 0% rate means that no revealed dangerous failures can be detected.

DCs: on-line diagnostic coverage of safe failures and is a rate between 0 and 100%. A 0% rate means that no revealed safe failures can be detected.


Developped way with the following parameters:



Note
The value can be edited manually or selected from a drop-down list using automatic completion.
Lambda DU (λ du): Dangerous undetected failure rate of the component (h-1).

Lambda DD (λ dd): Dangerous detected failure rate of the component (h-1).

Lambda SU (λ su): Safe undetected failure rate of the component (h-1).

Lambda SD (λ sd): Safe detected failure rate of the component (h-1).


SFF (Safe Failure Fraction): corresponds to the safe failure rate (λsd + λsu + λdd) / λ
Note
It is not an editable field.
MTTR (Mean Time To Repair) in h: mean time between detection of a failure and the repair of the component. The time unit is selected from a drop-down list ( hours , days , months , years ). The value can be edited manually or selected from a drop-down list using automatic completion.


Note
This field is editable only if DCd or λ DD are not 0 or if Test type is equal to Test when unit is working .
Test leads to failureγ (Gamma): probability [0,1] that the test will cause the hardware to fail. 0 means no test causes any failure, 1 mean every test causes failures. The value can be edited manually or selected from a drop-down list using automatic completion.


Note
This field is editable only if DCd or λ DD or if Test type is different of Not tested .


Caution
In the base of components, these information are filled in the following columns:

MODE : DEVELOPED or FACTORISED

LAMBDA ;

DFF ;

DC_D ;

DC_S ;

LAMBDA_DU ;

LAMBDA_DD ;

LAMBDA_SU ;

LAMBDA_SD ;

MTTR ;

MTTR_UNIT :HOUR, DAY, MONTH or YEAR;

GAMMA .





The advanced parameters of a sensor can be specified in the Advanced parameters part.




The advanced parameters of the sensor are as follows:


Component available during test (X): specifies whether the component is able to carry out its safety mission during the test (if the checkbox is checked).

Lambda during test λ*: failure rate of the component during the test (h-1). The test conditions may cause extra stress and increase the lambda. It is possible to indicate that the value is to be equal to lambda (λ du).

Test duration π (Pi): period of time necessary for testing the component. The time unit is selected from a drop-down list (hours, days, months, years).


Note
This field is editable only if Test type is equal to Test when unit is working.
Test efficiency rate σ (Sigma) : cover or efficiency rate of the test. The value ranges from 0 (the test never detects anything) to 1(the test always detects the failure).

Wrong re-setup after testsω1 (Omega1): probability [0,1] of wrong re-setup of the equipment after the test. It is the probability that the component will not be able to carry out its safety mission after being tested by the operator. It can be left at 0 if you consider that the operators and test procedures are infallible (no omission of a by-passed sensor, powering up the motor, etc.).

Wrong re-setup after repairsω2 (Omega2): probability [0,1] of wrong re-setup of the equipment after the repairs. It is the probability that the component will not be able to carry out its safety mission after being repaired (or changed) by the operator. It can be left at 0 if you consider that the operators and repairs procedures are infallible (powering up the new motor, etc.).

Coverage of the proof test : enables to specify if the component is tested on all of its failures, or if the component is tested only on a part of its failures. If a component is tested on all of its failures, then the coverage of the proof test is 100% (default value). If only a part of the component is tested, then it is possible to specify this coverage by giving a percent of the tested failures.

Lifetime of the component specifies if the component will be replaced once its lifetime is over to be refurbished. This parameter is linked to the Coverage of the proof test: where the latter specifies at what percentage the component will be repaired (and therefore at what percentage the PFD returns to 0), the lifetime of the component makes it possible to reset the PFD of the component to 0. It is therefore of no interest if the Coverage of the proof test is at 100%. Lifetime of the component must be a multiple of Proof Test Coverage. The efficiency of the test σ, set-up error after test ω1, and set-up error after repair ω2 are also taken into account when replacing with a new component. A blank field indicates that the component will not be replaced over the years of operation.

HFT specifies what is the Hardware Fault Tolerance of the component. It is possible that a component is modeled by only one virtual component in the model, but in reality it represents two or more hardware components. In this case, it is possible to enter an HFT specific to the component, to specify that it is actually several components. By default, the value of an HFT is 0: if a virtual component represents two hardware components, then its HFT is 1.




Caution
In the base of components, these information are filled in the following columns:

X: FALSE ou TRUE;

LAMBDASTAR;

LAMBDASTAR_EQUALTO_LAMBDA: FALSE or TRUE;

PI

PI_UNIT:HOUR, DAY, MONTH or YEAR;

SIGMA;

OMEGA1;

OMEGA2.

PROOF_TEST_COVERAGE.

LIFETIME

LIFETIME_UNIT:HOUR, DAY, MONTH or YEAR;

HFT




DC only alarmed :Percentage of detected failure that are only alarmed (non-triggering). This field is available only if channel is in M Mode.


Caution
In the base of components, these information are filled in the following column:

DC_ONLY_ALARMED : percent of DC only alarmed.





With partial stroking test: if checked, specifies whether the component takes partial stroking tests into account, as for example the partial stroke testing of a valve gate.

Important reminder : Dangerous undetected failures are failures that are not detected by the diagnostics coverage, as they can only be detected during the "complete" testing of the component in the proof test. However, during the partial tests, this part of the failures can be detected.


We have the following decomposition of these failures during these partial tests:


- a part of "Dangerous Undetected" failures detected by the partial tests between two complete tests. This share depends on the coverage of the partial test and is modelled using a complete periodic test law with 11 parameters.


- A part of "Dangerous Never Detected" failures that cannot be detected by either diagnostics coverage, partial tests or full tests. This part is modelled either by an exponential law if there is no lifetime information on the component, or by a simple periodic test law if there is a lifetime information on the component.


Component available during test (X): specifies whether the component is able to carry out its safety mission during the test (if the checkbox is checked).

Test duration π (Pi): period of time necessary for testing the component. The time unit is selected from a drop-down list (hours, days, months, years).

Proportion of detected failure :proportion of hidden failures detected during partial stroking tests (0-100%). 0% means no failure is detected, 100% means every failure is detected. LThe value can be edited manually or selected from a drop-down list using automatic completion.

Number of tests: number of partial stroking tests carried out between two full tests.




Caution
In the base of components, these information are filled in the following columns:

WITH_PARTIALSTROKING: TRUE ou FALSE;

PARTIALSTROKING_X: TRUE ou FALSE;

PARTIALSTROKING_PI;

PARTIALSTROKING_PI_UNIT:HOUR, DAY, MONTH ou YEAR;

PARTIALSTROKING_EFFICACITY;

PARTIALSTROKING_NBTESTS.






Configuring the solver
The solver of the safety loop can be configured in the Solver tab.


Note
In the following paragraph, "the component" means the sensor.
Solveur existant
The solver may be used in many SIF, and may has been defined in an existing solver of the document. The reference-solver can be selected in a list. This options is only available when you have many SIF.

Identification
Tag name : component's instrument tag on PID (e.g.: 10 PT 2034 for a sensor, 10 UV 2034 for an actuator, or 10_ESD_06 for solver).

Near to Tag name two icons enables you to export or import parameters from a xml file or from a database.

Import/Export components properties in xml format  Six actions can be chosen from the drop-down menu, displayed with a left click on the button:



Save as default model : saves the component's characteristics in the default model.

Re-initialise to default values : copies into the component the characteristics stored in the default model.

Save in a model file : saves the component's characteristics in a model file, whose location must be specified. This file can be reused or sent to another person.

Use a model : copies into the component the characteristics stored in a model whose location must be specified. The name of the file where the model is located will be displayed at the left of the button.

Connect to a model file : enables to connect a component to a model of a component stored in a database, whose location must be specified.

Disconnect to a model file : disconnect the component to the model file.


Base of components  By clicking on the icon 3 actions are available.



Use a component : copies into the component the characteristics stored in the base of components.

Connect a component : connect the component to a component stored in the base of components. The name of the file where the component is located will be displayed at the left of the button.

Disconnect a component : disconnect a component in the base of components.


Identical to : used to specify whether the component is identical to another component of the same type (i.e. a sensor when editing a sensor).

By clicking on the following icon  it is possible to copy another component's parameters.

This functionality can only be accessed when the SIF have several components of the same type. Only the characteristics Tag and Identical to are not copied. The components available are the same as those displayed for the functionality Identical to.


Warning
It is different from Existing component. Here the component is not exactly the selected one, they are physically distinct, but they have same parameters. This functionality can only be accessed when the SIF have several components of the same type. If the checkbox is checked, only the Tag of the component can be edited (the others are identical to the reference component).

Instrument category : category of instrument used and enables a better categorization of the sensors and actuator. They are selected from one drop-down menu. For sensor :


For actuators :



Instrument type : type of instrument used. They are selected from one drop-down menu. This list is updated regularly

Manufacturer : inform the manufacturer of the component.

Data source : Indicate where reliability data are extracted.

Description : open field where the user can add his own description of the component.


Caution
In the base of components, these information are filled in the following columns:

ID

REPERE

DESCRIPTION

INSTRUMENTED_TYPE:All the components type are given in the Appendix C, List of components

MANUFACTURER

DATA_SOURCE



Configuration
There is two types of failures for the solver: Dangerous failure and Safe failure.

Configuration type : specifies the solver's configuration type of the selected failure. Two types of configuration can be selected from the drop-down menu:

Simple : the solver is modelled by a constant law.

Advanced: the solver is modelled by a full periodic test law.

Specific law :user can be choose the law used to modelize the solver.



Caution
In the base of components, these information are filled in the column TEST_TYPE

CST : the solver is modelled by a constant law;

TPC : the solver is modelled by a full periodic test law;

LAW_SPEC : :user can be choose the law used to modelize the solver;



Instrument parameters
The parameters of the solver are described under Instrument parameters. They depend on the type of configuration which has been selected.

In the case of a simple configuration, the parameters are as follows:

PFD of solver: probability that the solver will not work when triggered. This value can be edited manually or selected from a drop-down list displaying all of the parameters with a Probability dimension.

SIL (computed from PFD): automatically displays the solver's SIL computed based on the solver's PFD.

PFH of solver: the PFH of the solver, given by manufacturer or by experience feedbacks.

SIL (computed from PFH): automatically displays the solver's SIL computed based on the solver's PFH.


In the case of an advanced configuration, the parameters are as follows:




Duration between tests (T1): period of time between two proof tests of the component. The time unit is selected from a drop-down list (hours, days, months, years). This value can be edited manually or using automatic completion.

Time of the first test (T0): time at which the first test of the component is carried out. The modes for editing this characteristic (value and unit) are the same as for the duration between tests.


Lambda DU (λ du): Dangerous undetected failure rate of the component (h-1). This value can be edited manually or using automatic completion.

MTTR (Mean Time To Repair) in h: mean time between detection of a failure and the repair of the component. The time unit is selected from a drop-down list (hours, days, months, years). This value can be edited manually or using automatic completion.

Test leads to failureγ (Gamma): probability [0,1] that the test will cause the hardware to fail. 0 means no test causes any failure, 1 mean every test causes failures. This value can be edited manually or using automatic completion.



Caution
In the base of components, these information are filled in the following columns:

PFD

PFH

T0: First test;

T0_UNIT:HOUR, DAY, MONTH or YEAR;

T1: Intervalle between test;

T1_UNIT:HOUR, DAY, MONTH or YEAR.

LAMBDA_DU ;

MTTR;

MTTR_UNIT: HOUR, DAY, MONTH or YEAR;

GAMMA.




Other parameters can be accessed by left clicking on the Advanced configuration ... button (only for a solver configured in advanced mode).





Component available during test (X): specifies whether the component is able to carry out its safety mission during the test (if the checkbox is checked).

Lambda during test λ*: failure rate of the component during the test (h-1). The test conditions may cause extra stress and increase the lambda. It is possible to indicate that the value is to be equal to lambda (λ du).

Test duration π (Pi): period of time necessary for testing the component. The time unit is selected from a drop-down list (hours, days, months, years).


Note
This field is editable only if Test type is equal to Test when unit is working.
Test efficiency rate σ (Sigma) : cover or efficiency rate of the test. The value ranges from 0 (the test never detects anything) to 1(the test always detects the failure).

Wrong re-setup after testsω1 (Omega1): probability [0,1] of wrong re-setup of the equipment after the test. It is the probability that the component will not be able to carry out its safety mission after being tested by the operator. It can be left at 0 if you consider that the operators and test procedures are infallible (no omission of a by-passed sensor, powering up the motor, etc.).

Wrong re-setup after repairsω2 (Omega2): probability [0,1] of wrong re-setup of the equipment after the repairs. It is the probability that the component will not be able to carry out its safety mission after being repaired (or changed) by the operator. It can be left at 0 if you consider that the operators and repairs procedures are infallible (powering up the new motor, etc.).

Coverage of the proof test : enables to specify if the component is tested on all of its failures, or if the component is tested only on a part of its failures. If a component is tested on all of its failures, then the coverage of the proof test is 100% (default value). If only a part of the component is tested, then it is possible to specify this coverage by giving a percent of the tested failures.

Lifetime of the component specifies if the component will be replaced once its lifetime is over to be refurbished. This parameter is linked to the Coverage of the proof test: where the latter specifies at what percentage the component will be repaired (and therefore at what percentage the PFD returns to 0), the lifetime of the component makes it possible to reset the PFD of the component to 0. It is therefore of no interest if the Coverage of the proof test is at 100%. Lifetime of the component must be a multiple of Proof Test Coverage. The efficiency of the test σ, set-up error after test ω1, and set-up error after repair ω2 are also taken into account when replacing with a new component. A blank field indicates that the component will not be replaced over the years of operation.

HFT specifies what is the Hardware Fault Tolerance of the component. It is possible that a component is modeled by only one virtual component in the model, but in reality it represents two or more hardware components. In this case, it is possible to enter an HFT specific to the component, to specify that it is actually several components. By default, the value of an HFT is 0: if a virtual component represents two hardware components, then its HFT is 1.



In case of specific law, user can be choose in all law implemented in Albizia (cf. Appendix D, Law )

Configuring the actuators
The actuators of the safety loop can be configured in the Configuration of componentsActuator(s) Parts tab. The actuators can be classified as follows:

Main actuators: they have 0, 1 or 2 sub-actuators.

Sub-actuators: they are set up in series with their respective actuators. The sub-actuators of a same main actuator are set up in series (2oo2) or parallel (1oo2).

Each main actuator can be accessed separately in the sub-tabs A1.1, A1.2, ..., and each sub-actuator in the sub-tabs A1.1a, A1.1b, ...


In the following paragraph, the actuator (main or sub) will be called "the component".

Existing component
The component may be already used/defined somewhere else in the system. In this case we speak about existing component. For example, when a component is in 2 channels. The existing component can be selected in a list. It can be a component of the current SIF, of one of another SIF. This options is only available when you have many components of the same type.

Identification
Tag name : component's instrument tag on PID (e.g.: 10 PT 2034 for a sensor, 10 UV 2034 for an actuator, or 10_ESD_06 for solver).

Near to Tag name two icons enables you to export or import parameters from a xml file or from a database.

Import/Export components properties in xml format  Six actions can be chosen from the drop-down menu, displayed with a left click on the button:



Save as default model : saves the component's characteristics in the default model.

Re-initialise to default values : copies into the component the characteristics stored in the default model.

Save in a model file : saves the component's characteristics in a model file, whose location must be specified. This file can be reused or sent to another person.

Use a model : copies into the component the characteristics stored in a model whose location must be specified. The name of the file where the model is located will be displayed at the left of the button.

Connect to a model file : enables to connect a component to a model of a component stored in a database, whose location must be specified.

Disconnect to a model file : disconnect the component to the model file.


Base of components  By clicking on the icon 3 actions are available.



Use a component : copies into the component the characteristics stored in the base of components.

Connect a component : connect the component to a component stored in the base of components. The name of the file where the component is located will be displayed at the left of the button.

Disconnect a component : disconnect a component in the base of components.


Identical to : used to specify whether the component is identical to another component of the same type (i.e. a sensor when editing a sensor).

By clicking on the following icon  it is possible to copy another component's parameters.

This functionality can only be accessed when the SIF have several components of the same type. Only the characteristics Tag and Identical to are not copied. The components available are the same as those displayed for the functionality Identical to.


Warning
It is different from Existing component. Here the component is not exactly the selected one, they are physically distinct, but they have same parameters. This functionality can only be accessed when the SIF have several components of the same type. If the checkbox is checked, only the Tag of the component can be edited (the others are identical to the reference component).

Instrument category : category of instrument used and enables a better categorization of the sensors and actuator. They are selected from one drop-down menu. For sensor :


For actuators :



Instrument type : type of instrument used. They are selected from one drop-down menu. This list is updated regularly

Manufacturer : inform the manufacturer of the component.

Data source : Indicate where reliability data are extracted.

Description : open field where the user can add his own description of the component.


Caution
In the base of components, these information are filled in the following columns:

ID

REPERE

DESCRIPTION

INSTRUMENTED_TYPE:All the components type are given in the Appendix C, List of components

MANUFACTURER

DATA_SOURCE



Determined character of the component
Determined character of the component : enables you to specify the component's determined character. The component is characterised by one of the three characters available:

Non-type A/B : indicates that the component is operating in negative safety mode (energies to trip) and without self-diagnostic system. Corresponds to the NS type (Non-safety component) of versions previous to 2013.

Type B : indicates that the component is operating in positive safety mode (fail-safe) or equipped with a self-diagnostic system. Corresponds to the S type (Standard component) of versions previous to 2013.

Type A : indicates that the component is operating in positive safety mode (fail-safe) and proven in use (or certified) and equipped with a self-diagnostic system (or implementation of several proof test) and access protected safeguarding the settings of the internal configuration parameters. Corresponds to the F type (Field proven component) of versions previous to 2013.


Caution
In the base of components, these information are filled in the DETERMINED_CHARACTER column:

NS for No-type A/B component;
S for type B component;
F for type A component;


Test
Test type: enables you to specify the type of test used for the component. Two types of test can be selected from the drop-down menu:

Test when unit is stopped: means that the component is tested when the unit is stopped. The test does not harm the safety function as the unit is no longer working.

Test when unit is working: means that the component is tested when the unit is working. The component is no longer available to carry out its function and this affects the safety function. This can be used when a sensor has been by-passed to be tested and the installation has not been stopped.


Note
it is also possible to specify that the component will undergo no periodic test.

Duration between tests (T1): period of time between two proof tests of the component. The time unit is selected from a drop-down list (hours, days, months, years).

Time of the first test (T0): time at which the first test of the component is carried out. The modes for editing this characteristic (value and unit) are the same as for the duration between tests.


Caution
In the base of components, these information are filled in the following columns:

TEST_TYPE:

TESTUNITWORK pour Test unité en marche;
TESTUNITSTOP pour Test unité à l'arrêt;
EXP pour Non testé;

T0: Fist test;

T0_UNIT: HOUR, DAY, MONTH or YEAR;

T1:Duration between tests;

T1_UNIT:: HOUR, DAY, MONTH or YEAR.



Instrument parameters
This part includes all reliability data for a component.

For failure rates 2 different ways can be used to inform them:

Simple way: with the following parameters:



Note
The value can be edited manually or selected from a drop-down list dusing automatic completion.
Lambda λ: failure rate of the component (h-1).

LambdaD/Lambda (λd/λ): proportion of dangerous failures among the total number of failures.

DCd: on-line diagnostic coverage of dangerous failures and is a rate between 0 and 100%. A 0% rate means that no revealed dangerous failures can be detected.

DCs: on-line diagnostic coverage of safe failures and is a rate between 0 and 100%. A 0% rate means that no revealed safe failures can be detected.


Developped way with the following parameters:



Note
The value can be edited manually or selected from a drop-down list using automatic completion.
Lambda DU (λ du): Dangerous undetected failure rate of the component (h-1).

Lambda DD (λ dd): Dangerous detected failure rate of the component (h-1).

Lambda SU (λ su): Safe undetected failure rate of the component (h-1).

Lambda SD (λ sd): Safe detected failure rate of the component (h-1).


SFF (Safe Failure Fraction): corresponds to the safe failure rate (λsd + λsu + λdd) / λ
Note
It is not an editable field.
MTTR (Mean Time To Repair) in h: mean time between detection of a failure and the repair of the component. The time unit is selected from a drop-down list ( hours , days , months , years ). The value can be edited manually or selected from a drop-down list using automatic completion.


Note
This field is editable only if DCd or λ DD are not 0 or if Test type is equal to Test when unit is working .
Test leads to failureγ (Gamma): probability [0,1] that the test will cause the hardware to fail. 0 means no test causes any failure, 1 mean every test causes failures. The value can be edited manually or selected from a drop-down list using automatic completion.


Note
This field is editable only if DCd or λ DD or if Test type is different of Not tested .


Caution
In the base of components, these information are filled in the following columns:

MODE : DEVELOPED or FACTORISED

LAMBDA ;

DFF ;

DC_D ;

DC_S ;

LAMBDA_DU ;

LAMBDA_DD ;

LAMBDA_SU ;

LAMBDA_SD ;

MTTR ;

MTTR_UNIT :HOUR, DAY, MONTH or YEAR;

GAMMA .




Warning
Sub-actuators do not have a Determined character of the component characteristic. The section relating to this characteristic does therefore not appear when configuring the sub-actuators. As a rule, the sub-actuator has the same character as the one defined for its main actuator.



The advanced parameters of an actuator (main or sub) can be specified in the Advanced parameters part.




The advanced parameters of the actuator are as follows:


Safe failure repairs don't impact safety function : if the case is checked, during safe failure repairs have no impact on safety function.




Component available during test (X): specifies whether the component is able to carry out its safety mission during the test (if the checkbox is checked).

Lambda during test λ*: failure rate of the component during the test (h-1). The test conditions may cause extra stress and increase the lambda. It is possible to indicate that the value is to be equal to lambda (λ du).

Test duration π (Pi): period of time necessary for testing the component. The time unit is selected from a drop-down list (hours, days, months, years).


Note
This field is editable only if Test type is equal to Test when unit is working.
Test efficiency rate σ (Sigma) : cover or efficiency rate of the test. The value ranges from 0 (the test never detects anything) to 1(the test always detects the failure).

Wrong re-setup after testsω1 (Omega1): probability [0,1] of wrong re-setup of the equipment after the test. It is the probability that the component will not be able to carry out its safety mission after being tested by the operator. It can be left at 0 if you consider that the operators and test procedures are infallible (no omission of a by-passed sensor, powering up the motor, etc.).

Wrong re-setup after repairsω2 (Omega2): probability [0,1] of wrong re-setup of the equipment after the repairs. It is the probability that the component will not be able to carry out its safety mission after being repaired (or changed) by the operator. It can be left at 0 if you consider that the operators and repairs procedures are infallible (powering up the new motor, etc.).

Coverage of the proof test : enables to specify if the component is tested on all of its failures, or if the component is tested only on a part of its failures. If a component is tested on all of its failures, then the coverage of the proof test is 100% (default value). If only a part of the component is tested, then it is possible to specify this coverage by giving a percent of the tested failures.

Lifetime of the component specifies if the component will be replaced once its lifetime is over to be refurbished. This parameter is linked to the Coverage of the proof test: where the latter specifies at what percentage the component will be repaired (and therefore at what percentage the PFD returns to 0), the lifetime of the component makes it possible to reset the PFD of the component to 0. It is therefore of no interest if the Coverage of the proof test is at 100%. Lifetime of the component must be a multiple of Proof Test Coverage. The efficiency of the test σ, set-up error after test ω1, and set-up error after repair ω2 are also taken into account when replacing with a new component. A blank field indicates that the component will not be replaced over the years of operation.

HFT specifies what is the Hardware Fault Tolerance of the component. It is possible that a component is modeled by only one virtual component in the model, but in reality it represents two or more hardware components. In this case, it is possible to enter an HFT specific to the component, to specify that it is actually several components. By default, the value of an HFT is 0: if a virtual component represents two hardware components, then its HFT is 1.




Caution
In the base of components, these information are filled in the following columns:

X: FALSE ou TRUE;

LAMBDASTAR;

LAMBDASTAR_EQUALTO_LAMBDA: FALSE or TRUE;

PI

PI_UNIT:HOUR, DAY, MONTH or YEAR;

SIGMA;

OMEGA1;

OMEGA2.

PROOF_TEST_COVERAGE.

LIFETIME

LIFETIME_UNIT:HOUR, DAY, MONTH or YEAR;

HFT





With partial stroking test: if checked, specifies whether the component takes partial stroking tests into account, as for example the partial stroke testing of a valve gate.

Important reminder : Dangerous undetected failures are failures that are not detected by the diagnostics coverage, as they can only be detected during the "complete" testing of the component in the proof test. However, during the partial tests, this part of the failures can be detected.


We have the following decomposition of these failures during these partial tests:


- a part of "Dangerous Undetected" failures detected by the partial tests between two complete tests. This share depends on the coverage of the partial test and is modelled using a complete periodic test law with 11 parameters.


- A part of "Dangerous Never Detected" failures that cannot be detected by either diagnostics coverage, partial tests or full tests. This part is modelled either by an exponential law if there is no lifetime information on the component, or by a simple periodic test law if there is a lifetime information on the component.


Component available during test (X): specifies whether the component is able to carry out its safety mission during the test (if the checkbox is checked).

Test duration π (Pi): period of time necessary for testing the component. The time unit is selected from a drop-down list (hours, days, months, years).

Proportion of detected failure :proportion of hidden failures detected during partial stroking tests (0-100%). 0% means no failure is detected, 100% means every failure is detected. LThe value can be edited manually or selected from a drop-down list using automatic completion.

Number of tests: number of partial stroking tests carried out between two full tests.




Note
Sub-actuators do not take partial stroking tests into account. There is therefore no Partial stroking test section in the sub-actuator configuration tab.



Caution
In the base of components, these information are filled in the following columns:

WITH_PARTIALSTROKING: TRUE ou FALSE;

PARTIALSTROKING_X: TRUE ou FALSE;

PARTIALSTROKING_PI;

PARTIALSTROKING_PI_UNIT:HOUR, DAY, MONTH ou YEAR;

PARTIALSTROKING_EFFICACITY;

PARTIALSTROKING_NBTESTS.






Edition of data table
Data table is used to have a global view of all components. There are 3 different tables:

Table of components:with all SIF components. It is made up of 4 columns i.e. code, tag name, description and type.

Edit sensors gathers in a same table all information for sensors (code, tag name, description, law, law parameters, etc...).

Edit actuators gathers in a same table all information for actuators (code, tag name, description, law, law parameters, etc...).

Edit solvers gathers in a same table all information for solvers (code, tag name, description, law, lawparameters, etc...)

Edit SIF gathers in a same table all information for SIF (code, description, SIL/RRF values obtaned or required, etc...)


Date table is the only place where you can fix the behavior of a component:

Degraded Operation Analysis : it is possible to force the component behavior.

By default: the component failure follows the parameters indicated by the user;

Dangerous detected failure forced: equipment is always in dangerous detected failure;

Dangerous undetected failure forced: equipment is always in dangerous undetected failure.


Caution
In the base of components, these information are filled in the following column:

BEHAVIOR : DEFAULT, FAILURE_DD or FAILURE_DU;



It is possible to display these tables. For that,refer you to

Safety Requirements Specification (SRS) Entry
Safety Requirements Specification (SRS) can be access by the data and computationsmenu and the following screen:



possible actions are:

Create a SRS: allows to create a new SRS in the model.

delete a SRS: allows to delete a selected SRS of the model.

Import a SRS: allows to importe a new SRS by a model.

Summary of results: allows to display the results of SRS.

Export SRS: allows to export SRS created in the model.

Edit of SRS: allows to edit selected SRS.

SRS are also edited directly in the SIL loop modelling area either by right-clicking and selecting properties or by the edit button at the bottom right.


then the screen of SRS opens.

Identification


Followings properties are informed and will be export with the report generation :

Number of the SIF : number of the SIF or of the note.

Revision : revision number of the note.

Date : release date of the note.

Produced by : name of the note author.

Checked by : name of the note checker.

Validated by : name of one who validate the note .

PID : PID number.



Description


Followings properties are informed and will be export with the report generation :

Location : specify plant.

Units : specify units, area or project.

SIF function : function of the SIF (expected event).

Description : descriptif de la SIF.

Data source : precise data source used for the calculation (ex : TotalEnergies, EXIDA, OREDA, etc).

Comment : comments.



Definitition


Followings properties are informed and will be export with the report generation :

Definition of the safe state : a definition of the safe state of the process for each identified SIF, such that a stable has been achieved and the specified hazardousevent has been avoided or sufficient mitiged.

Definition of any individually safe process states which can create a danger : a definition of any individually safe process states which, when occurring concurrently, create a separate hazard (e.g., overload of emergency storage, multiple relief to flare system)..

Source of demand on SIF and demand rate : the assumed sources of demand and demand rate on each SIF.

Demand mode :



Process Safety Time : Process Safety Time and this unit.

Response time : response time required and this unit.


Warning
It is recommanded to fill the Process Safety Time and the Response Time as they are considered in the SIF compliance. In addition, the Process Safety Time must always be higher than the Response Time. The warning message below will be displayed if the conditions are not respected.


Requirements


Followings properties are informed and will be export with the report generation :

PFD Avg : max value of U avg or PFD avg allowed.

PFH Avg (h-1) : max value of W avg or PFH avg allowed.

RRF : min value of Risk Reduction factor (RRF) allowed.

SIL : SIL must be reached and the percentage of time spent in this SIL (and higher SIL) must greater than specified percentage.

Other target definition : allows to define requirements through another compatible data (barrier of Bow_tie, ...).



Requirements for manual shutdown : allows to describe the requirements of manual shutdown of SIF.

Requirements relating to energize or de-energize to trip for the SIF : allows to describe the requirements relating to energize or de-energize to trip for the SIF.

Requirements for resetting of the trip after a shutdown : allows to describe the requirements for resetting each SIF after a shutdown (e.g. requirements for manual, semi-automatic or automatic final element resets after trips).

Required procedures for starting-up and resetting : allows to describe the requirements relating to required procedures for starting-up and restarting the SIF.

Requirements for bypass, overrides and inhibits : allows to describe the requirements for bypasses including written procedures to be applied during the bypassed state which describe how the bypasses will be administratively controlledand then subsequently cleared.

Requirements for the SIF to survive a major accident event : allows to describe the definition of the requirements for any SIF necessary to survivea major accident event (e.g., time required for a valve to remainoperationnal in the event of a fire).

Application programming requirement : allows to describe the requirements of application programming.



Results


Followings properties are informed and will be export with the report generation :

Achieved SIL : achieved SIL level for the SIF taking into PFD calculationand architectural constraints.

Achieved RRF : Risk reduction Factior computed.

PFD : probability of Failure on Demand.

PFH : Average frequency of failure.

MRT : The mean repair time which is feasible for the SIS, taking into accountthe travel time, location, spares holding, service contracts, environmental constraints, ... .

Proof test : Requirements relating to proof test intervals and implementations.

Components and/or systems : list of all components or systems présents of the barrier.

DCC : requirements to identify and take into account of common cause failure.



Cyber


Followings properties are informed and will be export with the report generation :

Cyber threat identification : a description of identified threats that could exploit vulnerabilities and resultsin security events (including intentional attacks on the hardware, applicationprograms abnd related software, as well as unintendedevents resulting from human error..

Cyber potential consequences : a description of potential consequences resulting for the security events and the likelihood of these events occurring.

Cyber consideration of various phases : a consideration of various phase such as design, implementation, commissioning, operation and maintenance.

Additional risk reduction for cyber : the determination of requirements for additional risk reduction.

Measures taken : a description of , or references to information on, the measurestaken to reduce or remove the threats. .



Attributes


This tab allows to list all of attributes for SRS fo this documents. If an attributes have "safety requirement" for type of data, there is listed automatically in this tab.


Assumptions


This tab allows to list all of assumptions for SRS fo this documents. We can be link one or severals assumptions to a SRS or delete them with "search" and "deleter" button :





The parameters
It is possible to create constants which can be booleans, integers or reals. These parameters can then be used for the configuration of different elements of the model (laws, events, transitions, ...)

Creation
The tab Parameters enables the user to define his parameters.



The toolbar enables to do basic operations of the data tables(« Description of the Tables »). The button "New" opens the window to create a parameter :




A parameter has a name, a definition domain (Real, Boolean, Integer), a value and a dimension (Failure rate, probability, time, factor, ...) and a unit in modules that handle units. The value can be a simple numerical value or une formula with +,-,/,* operators. You must add a whitespace before en after an operator.

Others additional fields are available in the parameters' table.

Unit	enables to define an unit of the parameter
Uncertainties	Activate uncertainty	enables to define the parameter as an uncertainty law
Law	
enables to define the uncertainty law. The law is editable and taken into account only if Activate uncertainty is selected in the parameter.
The uncertainties laws are detailed here « Uncertainties on the parameters »

Macro	
if the parameter is defined by an uncertainty law, and if two events use this same parameter, then the user can choose to use the same uncertainty value for the two events, (Macro unselected) or values distinctly computed (Macro selected).

Add-On	
enables to define the parameter by a GRIF add-on

SIL is delivered by default with 2 add-ons for the parameters :

Parameters database : is an add-on which enables the user to get the data of his parameter in a database or in a CSV or Excel file. This database is more detailed in this section « Database of parameters ».

Beta (61508) : is an add-on which enables the user to calculate the value of his parameter (β) from a set of questions defined by the IEC 61508-6 Table D.1 standard - for the captors and finals elements.

Add-on details	
gives a synthesis of the data defined by the add-on. A double-click on the cell enables the user to modify its definition.

Parameters database	Database	Displays the database name containing the parameter.
Identifier	Displays the identifier of the data in the database.
Update	Displays the date of the last update of the parameter from the database.
Beta (61508)	MooN	Define the configuration of the system (in functional logic) to use to calculate the beta.
Beta	Displays a button allowing to modify the choices made in the Table D.1 of the standard IEC 61508-6
Menu presentation
File
The File menu contains the basic commands: open, close, save, print, etc.




The New (default) function opens a new document which is generated from the module?s default template. To find out how to change the default template, see « Document template »

The New Blank Document function creates a new blank document.

The Open function opens an existing document.

The Save function saves the current document to a file. By default, the following location will be proposed for saving documents {user's home directory}/GRIF/2025/SIL

The Save As ... function is used to save a copy of the file you are currently working on under a different name or in a different location.

The Save Without Results ... function saves the document without its results data bank which can make the document too large. This function is used to send files by e-mail.

The Send By E-mail function is used to attach the current document to an e-mail and send it. The messaging tool is configured in the application options « Executables »

The Close function closes the current document. A window opens and asks if you want to save any changes made to the file.

The Document Templates menu includes features related to document reuse and pre-configuration, see « Document template ».




The Export Boolean Formula menu features several export functions, which can be used to generate a Boolean formula that can be opened with Fault-Tree software.




The Export .dag (selected elements) function: exports the selected elements into a .dag file
The Export .dag (ALBIZIA) function: exports documents in ALBIZIA format (containing CCF reports).
The Export .xml Open PSA function: exports documents in OpenPSA format.

The Import File function is used to import a document into the current document. A new page will be created using the name of the imported file.

The Export to .xlsx function saves all the loops in an Excel file. Each SIF loop is characterized in tabs, one for the description and result synthesis, the other for SIF loop configuration.




The Export to SVG image... function allows you to save the current page or the current selection in svg format.

The Create SIL Report menu is used to configure and generate a full PDF report on the instrumented safety loops in the document, in French or English. For more information on configuring SIL PDF reports, see Report.




TheGenerate report for certificationfunction: This function performs computations on all the files in a directory and generates an .xlsx file summarizing the results.

The Checksum menu is used to generate the checksum of an SIF loop, or to verify if an SIF loop has the same checksum as the one provided.

The Document Statistics function provides certain information on the size of the document (number of pages, number of groups, etc.).

The Document Properties function is used to access and edit the properties of the current document. These fields include: name, creation date, creator, description, version, etc. More information on this function is provided in section « Document properties / Track changes / Images management »

The Document Files function is used to include files within the current document. These files can then be exported to your reports. More information on this function is provided in section « Files of the documents ».

The Compare Two Documents function highlights changes made between two versions of the same document. More information on this function is provided in section « Compare 2 documents ».

The Recent Files menu lists recently opened files to provide faster access.

The Exit function exits the application. Any open documents will be closed.

Edit
The Edit menu contains all the commands needed to edit the current model.




The Undo and Redo functions are used to undo or redo the last actions performed. The history size for undoable actions can be configured in the application options.

The Copy, Cut, Paste and Paste and Renumber functionsare used to perform these actions on charts or comments. You can duplicate a loop by right-clicking it and using the Duplicate SIF contextual function.

The Remove function is used to delete selected graphic elements or data.If the selection is used somewhere else in the document, a message will pop-up to warn you.


This window will let you modify the data that are using the selection in order to remove the dependencies.

The Select All function is used to select all the graphic elements on the page.

The Properties function is used to edit the logical properties of the currently selected element.

Tools
The Tools menu contains all the commands needed to manage the current model (page management, alignment, options, etc.).




The New Page function: creates a new graphic page in the current document.

TheNew safety loopfunction: creates a new safety loop. A new page is added to the document if the current page already contains a SIF loop.

The Page Manager function: opens the page manager which is used to reorganize the pages of the document.

The Move To Page function: is used to move the current selection to another page or group in the document.

The Increase Page Size function: is used to increase the graphic input area of the current page.

The Decrease Page Size function: is used to decrease the graphic input area of the current page.

The Page Size function: opens a window to manually configure the size and zoom of the current page. More information on this function is provided in section « Zoom and page size »

The Refresh function: refreshes the graphic objects on the current page.

The Chart Models function is used to modify the default chart used for SIF loops.

The Display Toolbars menu is used to show or hide certain groups of toolbar shortcuts.

The Show Open Documents Bar: displays a shortcut bar providing access to documents already opened in GRIF in the lower section of the application.

The Display Graphic Toolbar checkbox shows/hides the graphic toolbar on the left of the application.

The Document Options function: opens a window to configure the document options. You have the option to configure a wide range of GRIF features (see « Options of GRIF - SIL module - Safety Integrity Levels »). Some configuration options only apply to the application and are accessed via the Application Options menu, while others relate to the document being edited and are defined in the Document Options menu. However, to avoid having to redefine your options between each document, document-related options can also be accessed via the application options.
The options selected will then be applied to all newly created documents.
You can also save the current document settings as the default settings for the application. To do this, open the Application Options window, then the Options tab and finally check Save Current Document Options as Default Options in the application.
In this same panel, you have the option to override the document options with the application options. To do this, check Application Manages Default Document Options. Apply default options to current document.

The Application Options function: opens a window to configure the application options. More information on this function is provided in section « Options of GRIF - SIL module - Safety Integrity Levels »

The Year Duration Set-up (in hours) function is used to change the number of hours making up a year. This option is available for all GRIF modules.

Chart model
The Chart Models function is used to modify the default chart used for SIF loops.




The Save As Default Model function saves the selected chart as the new default chart model. This new chart model will then be added when a new safety loop is created.

The Save As Model... function saves the selected chart as a new chart model. This model can be applied to other charts in the current document or other documents.

The Apply Default Model function uses the default chart model for the selected chart.

The Apply Model function uses a previously saved chart model (created with the Save As Model... function).

The Restore Factory Settings function applies the default chart model provided when the software was installed to the selected chart.

The Modify Chart Model function opens the configuration window for the selected chart.

Toolbar
The Display Toolbars menu is used to show or hide certain groups of toolbar shortcuts.




The Zoom checkbox shows/hides the page zoom shortcut bar




The Input/Output checkbox shows/hides the file shortcut bar




The Undo/Redo checkbox shows/hides the command history shortcut bar




The Computation checkbox shows/hides the shortcut bar for configuring and launching computations




Document
The Document menu provides access to all documents currently being modified or created.




The Next function: is used to select the next document

The Previous function: is used to select the previous document

Data and Computations
The Data and Computations menu is split into two sections: data management (creation and management of various parameters) and parameterization/launch of computations (calculation time, searched calculations, etc.).




The Edit Data Tables menu provides access to a set of non-blocking windows containing the model data in tables.

The Safety Requirement Specifications function opens the list of safety requirements related to safety functions.

The Edit Test Periods function is used to edit the test period for the current loop or for all the loops in the document. This function is available via the shortcut toolbar.

The Component Database function provides several features for configuring the document?s SIL components from a separate database. For more information on the different functions, see « Bases of components ».




The Compute Manager function: opens a non-blocking window via which you can manage computations launched by the application. For more information on the compute manager, see « Computation manager ».

The Invalidate Computation Cache function: To optimize calculations, certain computation data is cached. The Invalidate Computation Cache function is used to completely clear this data to ensure reliable results. During normal use of the software, this function is not required.

The Make Names and IDs Unique function: identifies and modifies duplicate data in the model. During normal use of the software, this function is not required.

The Verify function: checks the model data and displays any errors.

The Launch Computations on Invalid SIFs function is used to run a preconfigured computation on invalid loops. For more information, see « Launch PFD/PFH computation ».

The Launch Computations on Invalid SIFs function is used to run a preconfigured computation on invalid loops. An SIF loop is invalid if it has been modified since the last computation, either directly (modification of SIF loop settings) or indirectly (modification of a component in another SIF loop and used by this SIF loop)
Thus, computations will be rerun only on SIF loops for which it is absolutely necessary.

The Launch Computations on all SIFs and Systems function runs computations on all the SIFs and systems in the document.

Edit data tables
The Edit Data Tables menu provides access to a set of non-blocking windows containing the model data in tables.




The Edit Tables (new window) function: opens a new non-blocking window containing all the data editing tables.

The Edit Parameters function: opens a new non-blocking window containing the parameter editing table. Parameter settings are defined in the « The parameters ».

The Edit Attributes function: opens a new non-blocking window containing the attribute editing table. Attribute settings are defined in the « Attributes ».

Edit Risk Matrices: Opens a non-blocking window containing the risk matrix editing table. Risk matrix settings is used only for "Calibrated Risk Graph" plugin (See Risk module user manual).

TheEdit Acceptability Levelsfunction: opens a non-blocking window containing the acceptability level editing table. Acceptability level settings is used only for "Calibrated Risk Graph" plugin (See Risk module user manual).

The Assumptions function: opens a new non-blocking window containing the assumption editing table. Assumption settings are defined in the « Hypothesis ».

The Actions function: opens a new non-blocking window containing the action editing table. Action settings are defined in the « Actions ».

The Edit comments function: opens a new non-blocking window containing the comments editing table. This table lists all the comments in the document.

TheEdit SIFsfunction: opens a non-blocking window containing a table of all the safety loops in the document. Certain SIF description parameters can be edited and information on the computation results is displayed.

TheEdit Componentsfunction: opens a non-blocking window containing a table of all components in the document. Parameters that are common to all components can then be modified (see « Edition of data table »).

TheEdit Sensorsfunction: opens a non-blocking window containing Sensors editing table. Sensor settings are defined in the Sensor(s).

TheEdit Actuatorsfunction: opens a non-blocking window containing Actuators editing table. Actuator settings are defined in the Actuator(s).

TheEdit Solversfunction: opens a non-blocking window containing Solvers editing table. Solver settings are defined in the Solver.

Plug-ins
Depending on the version being used, certain GRIF plug-ins can be added to this menu.For more information on plug-ins, see the plug-in help documents.




?
The ? Menu contains several global GRIF configuration functions and provides access to the module's online help.




The About ... function : opens an information window indicating the software version used.

The Help function : provides access to the module's online help.

The Configuration menu contains a number of GRIF configuration elements.

The Send Errors Logs function: sends an e-mail to your reseller containing the module log files.

The GRIF update function: updates GRIF. This function detects whether updates are available for GRIF. If a newer version exists, you will be asked if you want to install it (see « GRIF update »).

The Français function: changes the application language to French.

The English function: changes the application language to English.

Configuration
The Configuration menu contains a number of GRIF configuration elements.




The License menu contains all the license server configuration functions. For more information on using licenses, please see the GRIF installation manual.

The Associate GRIF Files forces your operating system to associate the GRIF files and the various modules used to open them.

The Network Configuration menu: is used to configure network access to update the system.

License
The License menu contains all the license server configuration functions. For more information on using licenses, please see the GRIF installation manual.




The Hardware License (HL) menu is used to configure the license USB dongles.

The Software License (SL) menu is used to configure license servers that do not require a USB dongle.

The Configuration function: is used to configure license server access.

HL Key (USB dongle)
The Hardware License (HL) menu is used to configure the license USB dongles.




The Generate c2v File function: generates a c2v (Client To Vendor) file. This file will be requested by your reseller to update your license.

The Apply v2c File function: applies a v2c (Vendor To Client) file. This file will be returned by your reseller to apply your license update.

SL Key
The Software License (SL) menu is used to configure license servers that do not require a USB dongle.




The Generate Machine Fingerprint function: generates a c2v (Client To Vendor) file. This file will be requested by your reseller to create your license.

The Generate h2h File function: generates a h2h (Host To Host) file.This file is required to transfer your license to a new server. This feature must be used on the source server. For more information on the license transfer procedure, please see the GRIF installation manual.

The Generate c2v File function: generates a c2v (Client To Vendor) file. This file will be requested by your reseller to update your license.

The Apply v2c File function: applies a v2c (Vendor To Client) file. This file will be returned by your reseller to apply your license update.

Associate GRIF files
The Associate GRIF Files forces your operating system to associate the GRIF files and the various modules used to open them.




The For Current User function: associates GRIF files with the current user

The For All Users function: associates GRIF files with all users. This operation requires administrator rights.

Data Editing Tables
Description of the Tables
To create or modify data (parameters, variables, etc.), tables are available in the Data and Computations menu and in tabs at the right of the view. All the GRIF 2025.1 data tables operate in the same manner.

Note
It is possible to edit all tables in another screen using Data and Computations - Editing tables (new windows) menu.

The data editing table/panel is divided into 3 parts:

The upper part consists of a toolbar.

The main part containing the data table.

The bottom part indicating what the selected data is used for. This table is available only if the given data can be used by another data. The first column of this table indicates the name of these elements, the second indicates their location in the document (page, group). A click on a line from this lower table will open the page where the item is located and select it.


Here is an example illustrating the parameter table.



Different actions are available depending on the type of data displayed. Below is a non-exhaustive list of actions that can be found on the data tables.


Saves the table in a text file.


Import data from another SIL model or from CSV file.


Opens the column manager (cf. « Column manager »).


Displays a panel for searching or filtering data (cf. « Filter and sorting data »).


Find and/or replace expression in the table.


Edit the selection.


Multiple modifications made to all the selected data.


Add datas from plug-ins.


Permit to merge data in a unique data.


Creates new data.


Create the number of data indicated by user.


Duplicate the selected data (ask a new name)


Deletes the selected data (one or many).

When creating data with  icon, the data may be added directly in the table, in this case, configuration is done afterward by double-clicking of the cell or using the Edit button. For some data types, a configuration window is displayed and let you configure the data without the use of the table. For example, when you add a parameter, a configuration window is displayed. this window let you configure its name, its domain, its dimension, and its value that can be a numerical value or a formula containing usual operators (+, -, *, /) that have to come before and after a whitespace.




Filter and sorting data
The filter panel enables you to display only what is necessary in the data table.

It consists of a search part: the text entered is searched in all the cells of the table, only the lines whose text is present are preserved; and an advanced filtering part allowing to consider finer criteria according to the different fields of the data. It is possible to combine several filtering criteria, as below:



Select AND or OR to choose the type of association between each line (filter criterion). A line is a Boolean expression divided into 3 parts:

the first is the column on which the filter is used.

the second is the comparator.

the third is the value to which the data will be compared.


If the Boolean expression is true, the data will be kept (displayed); otherwise, the data will be masked. When the filter is enabled, its value is displayed between < and >.


The data in a column can be sorted by double clicking the header of this column. The first double click will sort the data in ascending order (small triangle pointing upwards). The second double click on the same header will sort the column in descending order (small triangle pointing downwards).

Note
The choices that are made are kept on the current document. They will be reapplied when reopening your document and do not affect other documents in the application.
Column manager
A table can contain many columns and to improve its readability it is possible to choose the columns that will be displayed as well as their order. To do this, click on the Columns Manager button, the following window opens:



You can choose the columns to be displayed by selecting (or deselecting) the corresponding check boxes. The arrows on the right are used to move the columns up or down in the list to choose the order of the columns. The Disable data sorting check box disables the data sorting. This improves the application's performance with very complex models.

Note
The choices that are made are kept on the current document. They will be reapplied when reopening your document and do not affect other documents in the application.
Multiple edition
To modify data, simply double-click on the cell to modify. When several lines are selected (using the CTRL or SHIFT keys) changes can be made to all the selected data by using Multiple changes. A window then opens to allow you to make these changes.


Items which cannot be modified are greyed. The white lines indicate that the selected data does not have the same value for the field in question. A new value can be entered which will be taken into account for all the selected data. The lines with no background color indicate that all the selected data has the same value for this field (in this example the selected data is all "Float"); they can be changed to give a new value to all the selected data.

Table accessibility
As mentioned above, the tables can be accessed via the Data and Computations menu; in this case, each table is displayed in a separate window.

To avoid having too many windows open, all the tables are grouped together in tabs on the right-hand side of the application. This area can be hidden/displayed using the small arrows above the input zone.


It is possible to choose the tables in this zone by right clicking on the tabs. A contextual menu appears, in which the user can select the tables s/he wishes to display.



The  icon at the top of the tabs will open a list of all available panels/tabs.

Attributes
Creation
The attribute tab enables the user to create attributes (custom fields). These attributes are used for definition of additional properties of any type of data. For example, if you want to define the area where a component is located, you can create an "area" attribute and define the linked type of data. You will then be able to specify the value of "area" attribut for each component.


The attribute properties are the following ones:

name;

domain ;

default value;

type of data: to choose where apply the attribute;

constraint.


The domain type can be of the following values:

Boolean: This kind of attribute is a boolean;

Integer: This kind of attribute is used to affect an integer value;

Float: This kind of attribute is used to affect a float value;

String of characters: This kind of attribute is used to affect a free text.

Data of model: This kind of attribute is used when the value must be chosen among a list of another type of data.


In Constraint part, user can enter a constraint on the attribute to ensure the proper use of the attribute in the model.

The constraint can be defined in enumerated tab where you can type the list of possible values. Once defined, only the defined values can be typed when you define the value of an attribut. In order to ease the selection (when you will have to define the attribute value for a component), you can add a description for each value. You can also define the color of a value, it will be used when the software draw attributes values under objects in the main view.





In addition, the attributes of float or integer type have a Constraint type Enumerate or Interval.

Use of the attributes
In a SIF loop, it is possible to associate attributes on components directly on the components tables :


Note
Attributes of a component can be imported from / exported to a component database. To import a component with an attribute from a database, the attribute must not have a reserved name, else an error will occur.
Data Bases
Database of parameters
In every GRIF module, a connection can be established with a database of parameters, to import parameters in GRIF. There are three ways to connect to a different database:

connection to a .csv file

connection to a .xls file

other connection (via JDBC).

Format of the databases
The database must contain the identifier, the name and the value of the parameter. It is possible to add to the parameters more information, as the unit, the dimension and the description of the parameter. So we can have three to six columns, inquiring:

Data's type:	Possible values:
Parameter's identifier	
Numbre, Text

Parameter's name	
Text

Parameter's value	
Number

Parameter's description	
Text

Parameter's unit	
HOUR : hours

DAY : days

MONTH : months

YEAR : years

HOUR_1 : hours-1

DAY_1 : days-1

MONTH_1 : month-1

YEAR_1 : years-1

FIT : Failure In Time (= 10-9 hours-1)

Parameter's dimension	
BOOLEAN, FACTOR, PROBABILITY, RATE, TIME, OTHER


Connect to a database
To access to the window to create the connections to databases, go to the menu Data and Computations -> Parameters database -> Connections .... A window appears then:




From this window, it is possible to :


Add a connection to a database.


Modify a connection to an existing database. It opens the same window when adding a connection, but the fields are already filled by the data previously entered.


Delete the selected connections of the databases.


Connection to a CSV file
Form of the database
This type of connection is the simplest. The CSV file has for extension ".csv". It is a simple text file where the different fields are separated by commas, tabulations or semicolons.




Connection
Once clicked on the button "Add a connection to a database", a window opens up:




This window has as a common base, the selection of the database, the fields for "ID", "name", "value", "description", "dimension" and "unit", and a button Test Connection. By clicking on this button, GRIF tries to connect to the database and so verifies the configuration provided by the user.

When adding a CSV database, the type CSV must be selected. A new field appears: the separators between the data. To sum up, there are three steps to add a connection to a CSV database:

First, fill the path of the CSV file in. A file explorer is at your disposal (button ...).

Then, specify the type of the separators used in the CSV file.

Finally, enter the six fields names of the CSV file. (Or only the ID, name and value fields) (Uppercase letters are taken into account as lowercase)

Connection to a XLS file
Form of the database
The databases of the .xls or .xlsx extensions correspond to EXCEL files. Here is an example of an EXCEL Database :




Connection
To connect GRIF to this database, select the XLS type in the connection window. The window is now as followed:




Sheet is the sheet's name where the data are located, and will be filled once a valid path to an EXCEL file has been entered.

Warning
It's important to note that when creating a connection to a XLS database, you must have all of the data on a single sheet.
Connection to a database (with a JDBC connection)
GRIF can connect to any database with JDBC, as long as the database follows the same rules of the databases seen earlier. The window for that kind of connection has multiples fields to fill:


Driver JDBC is the name of the JDBC driver (ex : sun.jdbc.odbc.JdbcOdbcDriver)

Connection URL is the URL of the database.

The fields Login and Password can be left empty.

The SQL request SELECT id,name,value,description,dimension,unit FROM REX is used to gather the dates.

Option field inform of all of the database's options: separator, ...

Once a connection with a database is ready, GRIF can now import a set of parameters from the database, but also updates these parameters when modifications has been made in the databases, or recreate the links of these parameters so they can now take the values of another database.
Import parameters from a connected database
Once a database is connected, GRIF can import a set of parameters from the database, via the window reachable by the Data and computations -> Parameters database -> Copy parameters from database ... menu.


Select the parameters you want to import, and click on OK. The parameters are now created and imported in GRIF. The created parameters have the same names than the database's parameters, and the fields "Description" or "Dimension" are identical of those found in the database.

It is important to underline that it is possible to manually create a parameter in GRIF, and then with its Add-On menu, assign the parameter's value of the connected database.

Update of the parameters from the database
When an user, who has updated some of his data in his database, wants to have these modifications done on his parameters in GRIF too, he can then use the update action, from the Data and Computations -> Parameters database -> Update from database ... menu:




This window shows the parameters in GRIF which are connected to parameters from the databases. The red lines correspond to data which have been modified in the database. If the user wants to update some of his parameters in GRIF, he must select the lines of the wanted parameters, and then press the OK button. The parameters are now updated.

Rebuild of the links to the database
It is possible to modify an existing parameter's connection in GRIF, by changing the database of its associated parameter. However the parameter can only connect to the parameters with the same name. This action is available by the Data and Computations -> Parameters database -> Rebuild links to the database menu.




Here we can see the different parameters of the databases, which are imported in GRIF, and which are on multiples databases. So on the line of the parameters you want to rebuild the links, select the right database, and then validate your modifications by clicking on OK. GRIF then update the values of the parameters by rebuilding the links.

Bases of components
Users can create base of components with all characteristics needed to create safety loops in an Excel file. This feature is available in the menu Data and Computations - Bases of components .


Export to xlsx
This action enables to create an Excel file with the correct format to be used for the creation of the component base which will then be compatible with the SIL module.

This database contains by default the equipment present in the current document when it is created and can be modified to create a database with your own data.

The file created has 3 tabs for each part of the the architecture :

SENSORS ;

ACTUATORS ;

SOLVERS ;




All the information required for the creation of a component can be filled in the database. The headings of the columns are indicated in the chapter Configuration of components . They are indicated by the icon 

Warning
IIt is not necessary to create all the columns in the Excel file. In this case, the values of the information of the elements not present will be the default values of the components.
Connect to a component base
This action enables, once the database file has been created, to connect it to the SIL Module. A window opens and enables you to search the file :





After selecting the correct file the following window opens and enables to display the database information




Disconnect
This action enables to disconnect from the database currently linked to the SIL module

Base of component
This action enables to visualize the connected database with the same database information visualization window dispalyed with Connexion à une base de de composant action

Update the components
This action enables to update components linked to a database if it has been modified

Convert the base to the new format of SIL
This action enables to update of the database if in the versions of GRIF subsequent to its creation modifications have been made in its structure.

Computes
Launch PFD/PFH computation
When all of the components have been configured, computations can be started. PFD and PFH Computations are performed for each SIF. User can choise between:

launch calculation only in the current SIF: in this case, calculations are launched via the menu Data and Computations / Start computation only in the current SIF , or in the icon 

lauch computation on invalided SIF: in this case, calculations are launched via the menu Data and Computations / Start computation on invalided SIF , or in the icon  . All modified SIF by the user will be calculate.

Invalided SIF are highlighted with the following icon: 


All these launch computation commands are grouped in the icon bar:




Computations results
When computation is performed, the chart, which contained no information, has now been updated.


Note
The combination Control+Scroll wheel enables you to enlarge (zoom in) or reduce the window.
The x-axis represents the time in hours and the y-axis represents the probability of failure of the SIF when triggered, also called PFD. The chart ranges from 0 to 30 years by default but it is possible to modify this value as explained in the chapter on curves. There are 5 curves in the chart:

PFD(t) or PFH(t): the instantaneous value of the system's PFD/PFH.

PFD Avg or PFH: the average value of the system's PFD/PFH.

Actuators: the instantaneous value of the PFD/PFH of the actuator part of the system.

Sensors: the instantaneous value of the PFD/PFH of the sensor part of the system.

Solver: the instantaneous value of the solver's PFD/PFH.

The curves are located in one or several bands of color. These bands represent the PFD ranges, which define the SIL:

SIL 0: instantaneous PFD ∈ [10-1; 1]. instantaneous PFH ∈ [10-5; +infinity].

SIL 1: instantaneous PFD ∈ [10-2; 10-1[. PFH instantanée ∈ [10-6; 10-5[.

SIL 2: instantaneous PFD ∈ [10-3; 10-2[. instantaneous PFH ∈ [10-7; 10-6[.

SIL 3: instantaneous PFD ∈ [10-4; 10-3[. instantaneous PFH ∈ [10-8; 10-7[.

SIL 4: instantaneous PFD ∈ [0; 10-4[. instantaneous PFH ∈ [0; 10-8[.


Computation manager
Computation manager shows the calculations. That are currently running or already performed.


Computation manager is automatically displayed when calculations are performed. User can display the window using the following icon .

This tab is made of 6 columns:

Time: The hour of calculation launch;

CPU: number of CPU used;

Document: document name;

Computation name: name of results file;

Progress: progress bar;

Status: finished in green, in progress in yellow, error in red;

In Computation Manager some actions are available:

: allow to reorganize the calculations order;

: display the following windows for computation settings:


: stop selected computation;

: suspend selected computation;

: resume suspended computation;

: display results of selected computation;

: details errors;

: remove selected computation;

: clear all computation;

When a task is added to Computation manager, user is not blocked until the task is ended. He can continue to work on his model. He can even relaunch a calculation. The various tasks accumulate and are treated sequentially.

Multi-loop systems
Creation of sevaral instrumented loops
It is possible to create several instrumented loops in a same document. To add new SIF, use the following icon  .

New loops are configured in the same way as the first one (cf. ).

Different SIF created can use parts or components already present in others loops:

an existing component .The existing component can be selected in a list. It can be a component of the current SIF, or one of another safety instrumented loop. This options is only available when you have many components of the same type.
an existing part . In this case, it is all sensor-parts or actuartor-parts which are identicals. To use this functionality, check Configure existing Parts/Channels in Data and Computations . After, in Actuartor-part or Sensor-part, check Existing part and select reference part.


A new safety instrumented loop can be created by a duplication of another one already created.

With a right click on SIF to duplicate in the arborescence:

With a right click on the SIF directly in the graphical imput zone:



Import from a another document
It is possible to add new SIF with an import from another document. In Files menu, select Import a file .


In this case, imported SIF will be in a file which the name is imported file:


Presentation
When several loops (SIF) are created in a document, a tree view on left left become visible. The upper part let you browse the pages (one page by SIF). The lower part is for systems that are made with several loops.



Input
Double-click one the root of Multi-loops systems tree in order to create an empty system.

System editing can be done either with a double-click or with a right-click using Properties menu. The following window is displayed:



You can enter Number and a Name . The Automatic checkbox generates a name starting with a base name followed by the number.

A text area is available for adding a Description to your system.

The System configuration defines the logical use of the loops.

Serial : Safety loops are in serial, every loop must be available to have an available system.
Parallel : Safety loops are in Parallel boucles de sécurité sont en parallèle, le système reste disponible tant qu'il reste au moins une boucle disponible.
Manual: You can specify the configuration of the system as 1 & (2 | 3), with 1,2 et 3 corresponding to the loops which ID is 1 2 and 3.

The Loops of the system part enables adding/removing/modifying of loops that are in the system.

Computations
System PFD/PFH computations are made as for SIF PFD/PFH computations. ( « Computes » )

Reports and results
Results are available with a right-clic on the system, and then select Computation results in the menu.



The following window is displayed:



The Description part sum system configuration up.

The For the system part is used to specify the target values:

Requiered SIL : value of the SIL that is requiered for the system.

Requiered RRF : value of the RRF that is requiered for the system.


The Computation part displays computed values:

Operating duration : the operating duration used for the computation.

PFD or PFH : The computed PFDAvg or PFH.

Computed SIL : SIL computed from PFD or PFH (architectural constraints are not taken into account).

Computed RRF : RRF computed from PFD or PFH .


The Results part displayed achieved targets:

Achieved SIL : Identical to computed SIL.

Conclusion of SIL for the system : conclusion (compliant or not compliant).

Remark : Remark generated by software.

Comments : User descriptions.


The Synthesis part displays PFD/PFH curves of the system

PDF report and MS Excel report
If there are system in your document, they will be automatically exported in reports. An additional section will be added for each system, at the end of the report. The system section contains information in Reports and results window.

Charts
Curves are drawn to study the results better. Five curves are available: PFDAvg(t), PFDSystem(t), PFDActuators(t), PFDSolver(t), PFDSensors(t).

Charts Edit window
The Charts Edit window is displayed when user double-click on charts.




This window is divided into several parts:

Charts Title: enables you to give a title to the graphic.

Data List: This part contains a three-column table listing the chart's different curves (name, description, display, curve colour, curve style, curve thickness).Several buttons are available above this table.

Up : moves the selected curve upwards in the list.

Down : moves the selected curve downwards in the list.

Save as default model : saves current chart setting as default setting for new documents.


For each curve, you can specify its colour, its style of points, its thickness and its display options.

Style: This part deals with displaying curves.

Style type: specifies the type of all the chart's curves (line or histogram). N.B: For histogram style, bars going outside drawing zone will be drawn with a gradient to warn user that he has to change intervals to see the entire bar.

Intervals on X and Y: Specifies the display interval for the X and Y axes (default interval or user-defined interval). This last function can, for example, be used to zoom in on the most interesting parts of the curve.

The log check boxes are used to enable the logarithmic scale on the axis concerned. Important: 0 cannot be represented on a log scale, remember to give a strictly positive starting point (e.g.: E-10). If 0 is given, the log scale will start with an arbitrary value E-15.

When domain axe deals with time, you can choose time unit among: hours, days, months, years. Default display is "hours" because it is the usualy used unit for modeling. It's only available in SIL module.


Note
If the computations are with uncertainties, it is possible to check the Display dispersion interval and the chart will display the uncertainties interval.

Editing the curves
When a curve is edited (with a double-click on its name in list of curves), the curve edition window is displayed. The following window id displayed:



The window is divided into three parts:

Legends: enables you to give a title to the curve.

Value to be displayed: used to select the values which are to be displayed or not below the curve.

For SIL curve (probability functions of times), available values are:

SIL 0: percentage of time spent in SIL 0.

SIL 1: percentage of time spent in SIL 1.

SIL 2: percentage of time spent in SIL 2.

SIL 3: percentage of time spent in SIL 3.

SIL 4: percentage of time spent in SIL 4.

Minimum: the minimum instantaneous PFD over the period studied.

Maximum: the maximum instantaneous PFD over the period studied.

Mean: the average of the PFD over the period studied.



For average probability curves (like PFDAvg), available values are:

Minimum: the minimum value of the average PFD over the period studied.

Maximum: the maximum value of the average PFD over the period studied.

Mean: the average value of the average PFD over the period studied (which is NOT the PFDAvg).




When the values are entered, just click on OK to close the windows.

Compare 2 documents

This function is accessible using File / Compare 2 documents. The following window appears:




Icon  enables loading of the files to be compared.


Click on  to launch the comparison.


Difference can be sorted using 3 criteria: internal key, external key or name for nodes

Internal key enumerates the differences according to internal elements of the model for example identifier, creation index, etc...

External key differentiates elements according to the names of the elements of the model.

Name for nodes differentiates nodes according to their names. The external key comparison will be used for others elements.





Colour signification is:

: element is identical;

: element is added;

: element is modified;

: element is deleted.



In order to reduce the number of displayed modifications, you can specify the properties for which you want to consider differences. Sometime, knowing that a property has been modified in not useful for users, for example the property that says if data are observed for computations. The filter of compared properties is done with the  button, you can also "Trim and ignore case" of text properties.


Zoom and page size
When creating a model, if the page size is not big enough, it can be changed using the menus: Increase page size (Control+Keypad +), Reduce page size (Control+Keypad -), Page size (Control+Keypad /) under the Tools menu.

The Page size menu enables the user to edit the page dimensions directly.



Page zooms can be modified either by using the toolbar menu:


Or by selecting the display and using Control+mouse wheel scroll up to zoom or Control+mouse wheel scroll down to zoom out.

The padlock on the toolbar is used to apply the zoom to the current page or to all pages in the document.


The zoom applies to all pages in the document.


The zoom is applied only to the current page.


Note
If an element is selected on the page, the zoom will be performed on that element.
Hypothesis
In the data table, in Hypothesis tab, it is possible to follow-up and track the studies hypothesis.


This table enables to take into account the study hypothesis and add file or date to indicate that this hypothesis is taken into account.

Actions
In the data tables, Actions tab, it is possible to define and monitor the actions carried out on the installation represented in the model.


An action is composed of a set of information justifying the intervention on an installation. It will be composed of the fields:

The Number of the action

The Name of the action

The Description of the action

The Category of the action (Verification, Intervention, ...)

Several dates explaining the timeline of the action :

A Planned date specifying when the action was scheduled

A Completion date specifying on what date the action actually took place

A Verification date, specifying when the changes made by the action were checked


The different actors of the action :

The actor who carried out this action, to be specified in the field Realized by

The actor who checked and validated this action, to be specified in the field Verified by.


The Impacted elements by this action, directly binded with the elements present in the model.

The Assumptions behind this action.

The Files linked to this action such as a report of an intervention, a report, ...


Note
Unlike a Common Cause Failure, the actions do not modify the behavior of the impacted elements, the actions having only an informative and non-calculative purpose.
Document properties / Track changes / Images management
File - Document properties menu enable to save information about document: name, version, comment, ... This information is available in General tab.



Modification tab enables to save A history of the modifications.

There are two different ways to save modifications:

At each saving by checking: Modification track when saving dans Tools - Document (or Application) options .




After each saving, a window will be displayed to type data related to the modification (user, dat, description, ...).



When the user wants directly in Modification tab of the properties using the button 





Images may be very useful to represent sub-system. GRIF 2025.1 enables to save images that can be used in different parts of software (groups, prototypes, ...). Images management is made in Images tab.


To add a new picture into document, use  icon. A double click in File column enables to select a picture (jpg, gif or png). A double click in Description column enables to give a name or a description to selected image.

Once in document, picture can be linked to a groupe with Group - Picture change menu.

Images are saved inside document, pay attention to picture size (150x150 max. advised). Because images are inside document, you have to re-add picture if picture is modified erternaly.

Files of the documents
It is possible to associate external file using File - Files of the document menu.



The following icons allow to:

 reload files;

 open files;

 open directory where file is saved.


Document template
It is possible to use an existing document as base to create a new document or as a part of a document. This functionality is accessible in File - Document template menu.




New (from template)... menu enables to open a new document and to initialize it with data from a model already build. A window appears to select the existing model.




Import a template... menu enables to add to the current document data from a model already build.

Save as template enables to save the current document as template in the Template directory of the module. Once saved as a template, the document appears in the Template tree of the GRIF window as well as in the Template Manager.




It is possible to create new files from this model using New (from a template)... action. A drag and drop to the templates from the input area enables to import the model quickly.




Save as default template menu enables to save the current document as default model in the module template directory. This model will also be the default model of the module. It will be used as base for creating a new document when File - New (default) action is used.

Template manager menu opens a window to manage the template of the document. New document libraries can be added/deleted. To add a new library it is necessary to select a directory of the file system. The tool analyzes the documents in this directory and builds a library that can be used by GRIF based on the compatible documents found.




Generating reports
The PDF reports can be configured in the tab Report and its sub-tabs Identification and Description:

Identification


When report is generated the following fields are exported:

SIF Identifier: identifier of the SIF or report.

Revision: revision index of the report.

Date: date on which the report was issued.

Produced by: name of the author of the report.

Checked by: name of the checker of the report.

Validated by: name of the person who validated the report

PID: number of the PID.


Description


When report is generated the following fields are exported:

Localization: specify the refinery, the platform, the plant.

Units: specify the units, the sectors, the workshops, the project.

SIF Function: function of the SIF (top event).

Description of the SIF: description of the SIF.

PST required: "Process Safety Time" required with its unit.

PST obtained: "Process Safety Time" obtained with its unit.

Data source: source of the data used in the computations (e.g.: TotalEnergies, EXIDA, OREDA, etc.).

Comment: comments.


You can save fields of SIF in a model in order to use it for other SIF description. Click on the top right button:



Result SIL
Result SIL tab do a synthesis of results.

For PFD calculations:

For PFH calculations:



On the top of the tab you must specify the objectives to be reached and sollicitation mode :

Demand mode :



Required SIL: value of the SIL required for the SIF.

Required RRF: value of the RRF required for the SIF.

Then the softwre reminds you the maximum reachable SIL of each part. (not available if many channels)
Maximum reachable SIL for sensors: maximum SIL which can be reached by the sensors due to architectural constraints.

Maximum reachable SIL for actuators: maximum SIL which can be reached by the actuators due to architectural constraints.

The "Computation" part reminds the computed values:
Operation duration: The duration used to do computation.

PFD or PFH: computed PFDAvg or PFH.

Computed SIL: SIL obtained with computed PFD or PFH. Architectural contraints are not taken into account.

RRF Calculé: RRF obtained with computed PFD or PFH.

Then the results part says if objectives are reached or not.
Achieved SIL: SIL obtained for the SIF according to the PFD computation and architectural constraints.

Conclusion of SIL for the SIF: conclusion (compliant or non-compliant).

Remark: Remark generated by the software. It shows the part whose Max-SIL is limiting.

Comments: Comments made by user.

Action plan: List of actions in order, for example, to met the target.

At the end of the tab, a table shows you values for each part in order to identify the most important contributor.
Spurious-trip

When a sensor has a detected failure, it can lead to the trigger of safety function, even if it is not necessary. It's the same thing for safe failure of actuators, which triggers the safety function. That is why the MooN configuration (with M > 1) are used, the trigger will not be made at the first safe failure.

The SIL module computes the number of expected spurious trips on a given architecture. Spurious-trip tab displays computation results of spurious-trips.

The export of spurious-trip-computation-results in reports is optional. Make sure that the Spurious-trip in reports option is selected in Application Options / Options.

Image
It is possible to assign an image to a SIF, so when the report is generated, the image displayed in the report is this one, instead of the picture of the SIF's architecture. This image can be displayed in the graphical view instead of the graphical representation of the SIF.




Note
It is possible to modify the image of the SIF directly by clicking on the graphical representation of the SIF, and by clicking on Specify SIF picture


PDF reports
When all the computations have been carried out, a report can be generated. The language of the report (English or French) can be selected.


The PDF report is generated from the File/Create a report/PDF report (en) menu (report written in English) or from the File/Create a report/PDF report (fr) menu (report written in French). In all two cases, you must select the location where the PDF file has to be stored and click on save. When the report is generated, it is opened with the programme associated with the PDF format (generally Acrobat Reader).

Sub-menuHeader/footer configuration specify a header, footer and background for the document.


Report is composed with several pages depending on the configuration:

Summary (if multiloop calculation): synthesis of the different loops with main results and page of detailed results.

Results for each SIF: Results are presented over 2 pages:

the first one for results (SIL, risk reduction factor, target met or not, contributions, time spent in each SIL if chacked on Document options/Export time spent in each SIL) and SIF references.

the second one for configuration of components (type of component, data used, etc...).


Test periods synthesis: test periods for all components are summarized in one table.

Actions plan: if any, they are gathered in the same table.


PDF report:




Microsoft Excel XLSX file format export
You can also export to XLSX format thanks to File menu. The file is made of two tabs, the first one for SIF description and results, the second one for configuration of components.

Checksum
The checksum is a sequence of numbers and letters which enables to identify precisely a document. There can be only one unique checksum by document, and only a simple variation of a property on this document will change this checksum. When someone send you a SIL document, and you have to be sure that this document is identical to the one of the sender (there might sometimes have some loss of datas when a large document is sent with a bad internet connexion), you can ask him this checksum from his document, so you can verify if the checksum is identical.

The creation of this checksum will depend on two parts of your SIL document :

The logical part of your document (Numbers of SIF loops, numbers of sensors, ...)

The options of the document.

The graphical part of the document does not count in the creation of this checksum. Move a graphical component will not change the checksum. The result part of the document, which is created thanks to the logical part and the options of the document, is neither taken into account, to allow the generation of this checksum to be faster.

The actions related to the checksum, like its generation or its verification, are available from the menu File -> Checksum:



The first part displays the checksum of the current document. A button is located on the right of this checksum, which enables to copy it on the clipboard.

The second part enables to verify if a checksum given by someone is identical to the generated checksum of the document received.

Use modes of the SIL module
To define a use mode, you must use the document options (menu: Tools/Document options) In the tab Editing modes you will have the choice between two modes of use: default or simplified.



The default mode allows advanced use of the tool. The components are fully configurable. The use of the tool is as presented in this manual.

The simplified mode is a more restricted mode in which the components are preconfigured and with certain options fixed.


The default mode



This is the most complete mode of use of the SIL module. All features described in this manual are available. The following options are configurable:

The Configure existing parts/channels checkbox: enables/disables the configuration of a channel (resp. a part) as being a channel (resp. a part) existing elsewhere. This setting is displayed in the loop architecture configuration. For more information on this type of configuration refer to Multi-loop systems

The Configure part-specific standards checkbox: enables/disables part-specific standard configuration (Sensors and Actuators)

The Configure Beta (dd) checkbox allows CCFs to be taken into account for dangerous failures detected by specifying a Beta (dd)

The Compute spurious trip checkbox: If checked, spurious trips will be calculated

The Compute sum of CCF Beta factors for components checkbox: When a component is used in several channels or parts, each defining a Beta of DCC: if this option is checked, the component will be added to all the CCFs impacting it. if this option is unchecked, the component will only be linked to the CCFs of the "original" component (ie. not defining an existing component).

The Simplified CCF for periodic tests checkbox: When several "periodically tested" elements are subjected to CCF, the worst parameters are normally chosen. If this option is checked then Gamma, Pi, X, Sigma and Omegas will be set to 0 for the CCF, moreover the repair will be instantaneous.

The Compute with uncertainties check box allows you to take uncertainties into account during the calculations.

The check box Simplify partial tests on components allows you to replace by constant laws the laws of partial tests that have a negligible maximum value. This option generates a constant law for partial stroking only if the ratio (max partial stroking)/(max full stroking) is lower than the threshold provided by the Authorized conversion threshold field. This significantly reduces the number of points in the results file.

The parameter Computation of λ for Beta-TOTAL CCFs allows to define the calculation method of the λ of the CCF Beta-TOTAL. The different methods are explained in the part: Appendix B, Configuration of Lambda computation method for CCF

The parameter Standard applied to constraints allows to select which standard will be used for the verification of architectural constraints. These standards are described in more detail in the chapter Architectural constraints definition.


The simplified mode



This mode makes it easier to enter and configure the calculations of the SIL module, making it both more accessible to new users and more reliable by limiting input errors on component parameters. Indeed, in this mode the components are no longer directly configurable; the user must choose his component from a previously defined database.

Settings
Default mode options are mostly set to fixed values. We list here those that remain configurable:

The parameter Standard applied to constraints allows to select which standard will be used for the verification of architectural constraints. These standards are described in more detail in the chapter Architectural constraints definition.

The Base of components (.xlsx) parameter is used to indicate the database that will be used to define the components. In the case of a TotalEnergies version, the database is predefined and this field cannot be edited. For more information on component bases, please refer to « Bases of components »


The Common Values part indicates a global setting of the components of the document. For more information on configuring component test periods, please refer to Sensor(s) Note that in this mode it is not possible to define Partial tests on a component.

Note
For more convenience, the configuration of the component test period can be done from the toolbar by clicking on the button  or via the menu Data and Computations -> Edit test periods

Usage


The input interface is lightened compared to the default mode: the component and loop architecture configuration panels have disappeared. Now all the configuration is done directly by interacting with the drawing of the loop.

Components marked with a red dot , are components that have not yet been linked to the component base. To define a component from a component base, double-click on it. The following selection window then opens:


The configuration provided by the database is then copied to the component which is thus connected to the database data.



Note
Calculations are only possible if all components are connected to the base.

Note
If an option or a setting becomes necessary for your modeling, you can always change from the simplified editing mode to the default mode. The opposite is possible provided that the configuration of the options is compatible, for example this is not possible if you define existing channels/parts on your model.

GRIF update
GRIF is a software suite that contains millions of lines of code. For a given major version, there are between 20 and 40 updates per year. These updates can fix bugs or add some GUI improvements. We strongly recommend you to use the latest update of the latest major version.

There are 3 solutions for using latest version:

Install the latest version: if you downloas the latest installable version (*.msi file) on GRIF web-site https://grif.totalenergies.com/en/services/customer-service/download-grif, its installation will replace the previous one installed on your PC.
Use latest portable version: you can also download the portable version (without installation) and unzip it into any local folder. Doing like this, you will be able to keep the previous version if you want to do comparisons between versions.
Update directly into the software with the "?"/GRIF Update menu. In this case a window will diplay your current version, the latest available version, and the list of all updates between the 2 versions. Whatever the module you start the update from, GRIF will be updated entirely, you must close other modules before updating.


If you want to use a new major version (from example from GRIF2023 to GRIF 2024), the first two solutions can be used.

A. Options of GRIF - SIL
Options of GRIF - SIL module - Safety Integrity Levels
The Tools - Application Options menu opens a window containing the following tabs:

Options
The Options tab contains options for modifying application behavior :

Save current document options as default options in the application : Saves current document options as default application options.

The application manages the default options for documents. Apply default options to the current document : Applies options - application options - to current document.

Time in minutes for automatic backups : Time between automatic backups. A value <= 0 disables the automatic backup function.

Maximum number of undos : Indicates the number of undo/redo actions available.

Number of recent files : Indicates the number of files in the list of recently opened files

Display windows : Displays tables either separately (external) or within the main window (internal).

Columns resized in tables : Used to select from which column(s) space will be taken when resizing columns.

Request confirmation before deletion outside the input area : When deleting an element in the graphic tree or in the data tables, a confirmation message will be displayed.

Manage new names by avoiding duplicates : Prevents name conflicts by creating objects with unique names (mainly using copy/paste).

Synchronize view with tables : Used to select an object in data tables when selected in the view.

Synchronize view with tree structure : Used to select an object in the tree structure when selected in the view.

Request confirmation when clicking on close button : When closing a dialog box with the cross at the top right, the software will ask for confirmation. Either click on OK or CANCEL if you do not want to close the box.

Track modifications when saving : By enabling track modifications, you can add a comment about any modifications made to each document when saved.

Show debug functions : Displays a Debug tab in the calculation settings allowing to activate other options.

Base of components (.xlsx) : Path to default component database

Default directory for PDF reports : Default path for creating PDF reports

Default directory for component models : Default path used for component models

Executables
The Executables tab is used to specify the paths to external executables :

Open PDFs automatically : Used to indicate whether PDF reports should be opened once generated.

Open results with another software : External software used for result opening. It will start the software with up to 3 files: - option file ($INI), - engine file ($DATA), - xml file ($RESULTS).

Moca-RPC path : Specify the Moca version 12 path.

Edit modes
Configuration and selection of editing mode :

Default mode : This provides access to the classic and complete version of the tool. [USEMODE_SILDEFAULT]

Simple mode : This is used for simple model configuration. The parameter configuration windows are removed from the predefined component profile. [USEMODE_SILSIMPLE]

Graphics
The Graphics tab is used to modify the appearance of the graphic base :

Use Windows style : Uses your system's look and feel rather than the Java style (GRIF must be restarted).

Use a universal font on the view : This option allows you to use the 'DejaVu' font on the view and to have a graphic rendering compatible between the different operating systems.

Element size : Changes the size of graphics.

Fill and outline for dynamic fields : Used to configure object outline (line color and width, background color, etc.).

Font for dynamic fields : Used to configure the font (color, size, italic, etc.) of information displayed under objects.

Shape fill and outline for comments : Used to configure object outline (line color and width, background color, etc.).

Font for comments : Used to configure the font (color, size, italic, etc.) of information displayed under objects.

Shape fill and outline for groups : Used to configure object outline (line color and width, background color, etc.).

Font for groups : Used to configure the font (color, size, italic, etc.) of information displayed under objects.

Show watermark : Allows to show or hide the watermark on all pages if it is defined in the printing options

Transparency in % of the watermark [0,100] : Allows to configure the transparency as a percentage of the watermark on the edition

Activate text anti-aliasing : Activates text anti-aliasing, display may be slower during this process.

Activate image anti-aliasing : Activates image anti-aliasing, display may take longer during this process.

Display tooltips : Activates tooltip system.

Hide more, non-computed information : More information will not be displayed under nodes if about a computation that has not been performed. This avoids the unnecessary display of "?".

Display the report image instead of the SIF diagram. : Displays the SIF image selected by the user in the report tab. The original SIF diagram will not be displayed.

Limit the number of components/channels to display. : Limit the number of components/channels to display. The extra components/channels will be hidden but accessible from the edit tab.

Numerical format
The Number Format tab is used to format the numbers displayed in the application :

Display parameters : Specifies the display format of parameters (number of digits after separator, etc.).

Computations/Results
Computations/Results :

Light batches : Deletes files used for each computation of batch computations to reduce memory/disk use.

Preferred rate unit : Unit that will be used to display the results of the "rate" dimension in the - main view, - data tables, - and some result syntheses.If no unit is displayed (namely, in detailed results) the unit is (h-1).

Preferred time unit : Unit that will be used to display the results of the "time" dimension in the - main view, - data tables, - and some result syntheses.If no unit is displayed (namely, in detailed results) the unit is (h).

Light result export : Exporting too much data could result in excessive memory use or generate unusable files. This option is used to limit the amount of detail in exported results and write only the synthesis

Apply modification factor to laws : Indicates whether a factor modifying the probability of a law can be applied. If this box is checked, an "Apply factor" box will be available when entering every law.

Selection of unit for law parameters. : Activate unit selection for each parameter in law editing windows.

Simplify partial tests on components : Partial test laws with a small maximum value are replaced by constant laws. This significantly reduces the number of points in the result file, if combined with the option to reduce identical points.

Use CCF with shock models : Use this option if your SIF contains more than 3 redundant sensors/actuators. CCF with shock models are more realistic than the Beta Factor model which is too conservative in these cases.

Export
Export options: PDF and XLSX :

Export systems : Includes results for multi-loop systems.

Export spurious trips : Displays information on spurious trips in XLSX and PDF reports.

Export summary (PDF) : Displays a summary of the different loops in PDF reports.

Export test periods for components (PDF) : Displays a summary table of the test periods for components at the end of the PDF document.

Export time spent in each SIL (XLSX, PDF) : Displays a summary table of the test periods for components at the end of the PDF document.

Export a summary of the actions to be taken (PDF) : Displays a summary of the actions to be taken at the end of PDF report.

Export SIF image selected by user (XLSX, PDF) : Exports the image selected in the report tab to represent the SIF. The original SIF diagram will not be exported.

Export components attributes to report (XLSX, PDF) : Export component attributes (solver, actuators, sensors).

Export files attached to document (PDF) : The files attached to the document will be exported as an appendix to the PDF

Charts
The Charts tab is used to change how charts are displayed. :

Frame chart with border : Adds borders to charts.

Frame generic values with border : Adds borders to generic values under charts.

Display grid : Used to draw a grid on the chart plotting area.

Display legends : Used to display legends under charts.

Plot area transparency : Makes the chart plotting area transparent.

Graphic transparency : Makes the chart area around the plotting area transparent.

Title size : Specifies the font size for the chart title

Generic value size : Specifies the font size for generic values

Point size : Specifies the point size on charts.

Coordinate size : Specifies the font size for coordinates.

Legend size : Specifies the font size for legends.

B. Configuration of Lambda computation method for CCF

When using common cause failure, the software must compute a lambdaCCF that will be used for CCF. It is the one that will be multiplied by Beta. Assuming each component impacted bay a CCF has a different lambda, there are many methods to compute the lambdaCCF from the list of lambdas. Five methods are available:

Minimum: This method uses the minimum value of lambdas. Not recommanded.

Maximum: Uses the maximum value of lambdas to be concervativ. This method was used in GRIF 2013 and previous version. It can be penalizing when lambda of components are very different.

Average: This method uses the artimetic mean of lambdas.

Geometric mean (Method detailed in PDS): This method uses the geometric mean of lambdas. It is PDS Method recommanded by SINTEF. It works fine with very different lambdas.

Quadratic mean: This method uses the quadratic mean of lambdas.





C. List of components
Sensors

ANALYSER_PROBE : Analyser probe

CURRENT_TRANSMITTER : Current transmitter

DENSITY_SENSOR : Density sensor

DENSITY_TRANSMITTER : Density transmitter

DETECTOR_BURNER_FLAME : Burner flame detector

DETECTOR_FIRE : Fire detector

DETECTOR_GAS : Gas detector

DETECTOR_PILOT_FLAME : Pilot flame detector

DETECTOR_VIBRATION : Vibration detector

ENERGIZE_TO_TRIP_LINK : Energize to trip link

INPUT_ANALOG : Analog Input

INPUT_CARD : Input card

INPUT_DIGITAL : Digital Input

IS_BARRIER : IS Barrier

MISC_CONVERTER : Miscellaneous converter

MISC_INSTRUMENT : Miscellaneous instrument

MISC_SENSOR : Miscellaneous sensor

MOTOR_STATUS : Motor status

POSITION_SENSOR : Position sensor

POSITION_TRANSMITTER : Position transmitter

POWER_SUPPLY : Power supply

POWER_TRANSMITTER : Power transmitter

PUSH_BUTTON : Push button

RELAY : Relay

RELAY_SAFETY : Safety Relay

ROTATION_CONTROLLER : Rotation controller

SPEED_SENSOR : Speed sensor

SPEED_TRANSMITTER : Speed transmitter

SURGE_PROTECTOR : Surge protector

SWITCH_FIRE : Fire switch

SWITCH_FLOW : Flow switch

SWITCH_GAS : Gas switch

SWITCH_LEVEL : Level switch

SWITCH_LIMIT : Limit switch

SWITCH_PRESSURE : Pressure switch

SWITCH_SPEED : Speed switch

SWITCH_TEMPERATURE : Temperature switch

TEMPERATURE_PROBE : Temperature probe

TORQUE_CONTACTOR : Torque contactor

TORQUE_SENSOR : Torque sensor

TORQUE_TRANSMITTER : Torque transmitter

TRANSMITTER_ANALYZER : Transmitter/Analyzer

TRANSMITTER_FLOW : Flow transmitter

TRANSMITTER_LEVEL : Level transmitter

TRANSMITTER_POSITION : Position transmitter

TRANSMITTER_PRESSURE : Pressure transmitter

TRANSMITTER_SPEED : Speed transmitter

TRANSMITTER_TEMPERATURE : Temperature transmitter

TRIP_AMPLIFIER : Trip Amplifier

VIBRATION_CONTACTOR : Vibration contactor

VIBRATION_SENSOR : Vibration sensor

VIBRATION_TRANSMITTER : Vibration transmitter

VICOSITY_TRANSMITTER : Viscosity transmitter

VISCOSITY_SENSOR : Viscosity sensor

VOLTAGE_TRANSMITTER : Voltage transmitter

WEIGHT_SENSOR : Weight sensor

WEIGHT_TRANSMITTER : Weight transmitter


Actuators

CIRCUIT_BREAKER : Circuit Breaker

CONTACTOR : Contactor

HARDWIRED_MOTOR_CONTROL_LOGIC : Hardwired motor control logic

LINK_ENERGIZE_TO_TRIP : Energize to trip link

MISC_ACTUATOR : Miscellaneous actuator

MISC_CONVERTER : Miscellaneous converter

MISC_INSTRUMENT : Miscellaneous instrument

MOTOR_CONTRACTOR : Motor contactor

MOTOR_CONTROL_LOGIC : Digital motor control logic

MOTOR_ELECTRIC : Electric motor

OUPUT_DIGITAL : Digital Output

OUTPUT_CARD : Output card

RELAY : Relay

RELAY_SAFETY : Safety Relay

SUPPLY_PNEUMATIC_HYDRAULIC : Pneumatic/hydraulic supply

SUPPLY_POWER : Power supply

SURGE_PROTECTOR : Surge protector

VALVE : On/off valve

VALVE_AIR : Air operated on/off valve

VALVE_CONTROL : Control valve with actuator

VALVE_DELUGE : Deluge on/off valve

VALVE_DEPRESSURIZATION : Depressurization on/off valve

VALVE_ELECTRICAL : Electrical on/off valve

VALVE_HYDRAULIC : Hydraulic on/off valve

VALVE_SOLENOID_DE_ENERGIZE : Solenoid valve (de-energize to trip)

VALVE_SOLENOID_ENERGIZE : Solenoid valve (energize to trip)

VARIABLE_SPEED_DRIVE : Variable Speed Drive


Solver

CERTIFIED_SAFETY_RELAY : Certified safety relays

DCS : DCS

OTHER : Other

PLC : PLC

SOLID_STATE : Solid State

S_PLC : S-PLC


D. Law
Description of the laws
Note
A modifier factor can be applied in all the lawx by checking Apply modification factor on laws in document options.


Once the option selected, a field appears in the events to inform the factor:



In this case, the law is defined by:



UNDEF / Undefined
This law used as default law indicates as user, with an error message in the computation launching, that default law was not changed.

CST/ Constant law
This law has two parameters: the probability q and the inconditional failure rate w of the event. Whatever the time, the probability of the component failing is constant.

Parameter:

q (Probability)

w (Inconditional failure rate)


The law is defined as follows:



This law generally corresponds to the case where the only failure considered for the components is that of a refusal to change state (e.g.: Fails to start/stop, etc.).

EXP / Exponential law
This law only has a one parameter: the component's failure rate (supposed to be constant over time). It describes the time interval before the first failure for a non-repairable component.

Parameters:

Lambda (Rate) = failure rate


The law is defined as follows:



This law is widely used since it is almost the only one to make it possible to obtain analytical results. In addition, it describes the lifetime of a non-repairable component very well (at least when there are a large number of components) when the component is no longer young.

EXPD / Dormant exponantial
This law is used to model the dormant events in a more precise way than with a simple dormant law. It has three parameters: the failure rate of thecomponent (supposed constant during the time), the test periodicity and the mission time. This last parameter is not seizes by the user. It corresponds to the last wanted calculation.

Parameters:

Lambda (Rate) = failure rate

Tau (Duration) = test period (time interval between two consecutive tests)

Tmax (Time) = mission time (i.e. t maximum for all t to calculate) This parameter is automaticcally generated according to the last computation time.


The law is defined as follows:



Note
Results can be different when step by step calculation is made due to the fact that mission time is the maximum time calculation).
IND / Unavailability law
This law describes the behaviour of a component (repairable or not), with (or without) failure to start, using exponential expressions. It generalises the exponential law with the Lambda parameter (failure rate).

Parameters:

Gamma (Probability) = probability of initial start failure (at t = 0)

Lambda (Rate) = failure rate

Mu (Rate) = repair rate


The law is defined as follows:



The Gamma and Mu parameters are optional. Depending on the case, they can be zero.

If the component is not repairable, set Mu to zero.

If the component cannot fail to start, set Gamma to zero.



Note
The failure to start is only taken into account at t = 0.

WBL / Weibull
This law has three parameters: alpha, beta and t0. It describes the behaviour of a component which is not repairable and which does not fail to start. Its specific feature is that it takes account of the component's young and old periods.

Parameters:

Alpha (Time) = scale parameter

Beta Factor) = shape parameter

T0 (Time) = location parameter


The law is defined as follows:



The significance of this law is that new distributions can be tested by varying the beta factor:

If Beta is less than 1, the failure rate decreases and the law then allows the period when the component is young to be taken into account.

If Beta is greater than 1, the failure rate increases and the law then allows the component's ageing period to be taken into account.

If Beta is equal to 1, the Weibull law is equivalent to the exponential law.


WBP / Weibull periodic
This law follows the same logic as the classic Weibull law. It also makes it possible to take into account exclusively periodic preventive maintenance.

Parameters:

Age at t=0 (Time) = Virtual age of the component at the initial time.

Scale parameter (η) (Time) = Failure rate scale parameter

Shape parameter (β) (Factor) = Failure rate shape parameter

T0 (Time) = First date of preventive maintenance

Maintenance period (T1) (Duration) = Duration between two preventive maintenance

Efficiency (α) (Factor) = Preventive maintenance efficiency (age reduction factor)

ARA model (0 or 1) = Age reduction model:

0 : To use an ARA∞ model Following preventive maintenance (with or without induced corrective maintenance), the age of the component is reduced by a factor α.

1 : To use an ARA1 model Following preventive maintenance (with or without induced corrective maintenance), the age of the component taken since the last preventive maintenance is reduced by a factor α.


Coeff. applicable to the failure rate (Factor) = If x is the coefficient, the scale parameter will be multiplying by x^(-1/beta)


The definition of the law is as follows:

Either (δ) = "age reduction" parameter of the failure rate (in time units) calculated according to the specified ARA model.




General assumptions of the age reduction model:

No failure is present at the initial time.

Failures are only detected during preventive maintenance

All failures are detected at each preventive maintenance

The first preventive maintenance is carried out at T0

From T0, preventive maintenance is carried out periodically, depending on the period T1

The duration of preventive maintenance is negligible.

If a fault is detected during preventive maintenance, it is repaired immediately (the duration of corrective maintenance induced is negligible).


WBP10 / Weibull periodic (10 parameters)
Description	
This law, like the Weibull law from which it is derived, makes it possible to model the component's young and old periods.

It also makes it possible to take into account periodic maintenance with a different rejuvenation model between preventive and curative maintenance.

Parameters	

Age at t=0 (AgeV0) (Time) = Virtual age of the component at the initial time.

Scale parameter (η) (Time) = Failure rate scale parameter

Shape parameter (β) (Factor) = Failure rate shape parameter

T0 (Time) = First date of preventive maintenance

Maintenance period (T1) (Duration) = Duration between two preventive maintenance

Ara model of preventive maintenance (Mp) (0 or 1) = Age reduction model of preventive maintenance:

0 : To use an ARA∞ model. Following preventive maintenance, the age of the component is reduced by a factor αp.

1 : To use an ARA1 model Following preventive maintenance, the age of the component taken since the last preventive maintenance is reduced by a factor αp.


Efficiency of preventive maintenance (αp) (Factor) = Preventive maintenance efficiency (age reduction factor)

Ara model of corrective maintenance (Mc) (0 or 1) = Age reduction model of corrective maintenance:

0 : To use an ARA∞. Following corrective maintenance, the age of the component is reduced by a factor αc.

1 : To use an ARA1 model. Following corrective maintenance, the age of the component taken since the last preventive maintenance is reduced by a factor αc.


Efficiency of corrective maintenance(αc) (Factor) = Corrective maintenance efficiency (age reduction factor)

Coeff. applicable to the failure rate (Factor) = If x is the coefficient, the scale parameter will be multiplying by x^(-1/beta)


Definition	

n = number of preventive maintenances carried out before time t.
if t < T0,  n = 0
if t >= T0,  n = 1 + integer part of (t - T0) / T1

Age(t) = component age reduction function.
This value is calculated according to the formulas described in the following subsections.

h(t)	
h
(
t
)
=
β
η
β
⋅
A
g
e
(
t
)
β
−
1
Q(t)	
s
i
t
<
T
0
:
Q
(
t
)
=
1
−
e
−
∫
t
0
h
(
u
)
d
u
s
i
t
≥
T
0
:
Q
(
t
)
=
1
−
e
−
∫
t
T
0
+
(
n
−
1
)
T
1
h
(
u
)
d
u
w(t)	
w
(
t
)
=
h
(
t
)
⋅
(
1
−
Q
(
t
)
)
 	 
Text syntax	
'Weibull-periodic' '(' [expr]AgeV0 ',' [expr]eta ',' [expr]beta ',' [expr]t0 ',' [expr]t1 ',' [expr]mp ',' [expr]alphap ',' [expr]mc ',' [expr]alphac ',' [expr]lambdaCoeff ',' time ')'
			|
			'Weibull-periodic' [expr]AgeV0 [expr]eta [expr]beta [expr]t0 [expr]t1 [expr]mp [expr]alphap [expr]mc [expr]alphac [expr]lambdaCoeff
XML syntax	
    <extern-function name='Weibull-periodic'>
					[expr]AgeV0 [expr]eta [expr]beta [expr]t0 [expr]t1 [expr]mp [expr]alphap [expr]mc [expr]alphac [expr]lambdaCoeff time
    </extern-function>
Weibull-periodic (10-parameter) age reduction models
General assumptions	
No failure is present at the initial time.

Failures are only detected during preventive maintenance

All failures are detected at each preventive maintenance

The first preventive maintenance is carried out at T0

From T0, preventive maintenance is carried out periodically, depending on the period T1

If no failure is detected during the preventive maintenance, only the preventive maintenance effectiveness applies (depending on the model selected).

If a failure is detected during preventive maintenance, only the corrective maintenance effectiveness applies (depending on the model selected).

Preventive and corrective maintenance times are negligible.

 	 
ARA1 model	
As a result of maintenance (preventive or corrective), the age of the component taken since the last preventive maintenance is reduced by a factor of α. If a failure is detected during preventive maintenance, the model selected for corrective maintenance applies with α = αc, otherwise the model selected for preventive maintenance applies with α = αp.

NOTE: for the first preventive maintenance, it is the age of the element taken since t0 which is reduced by a factor α.

 	 
ARA∞ model	
As a result of maintenance (preventive or corrective), the age of the element is reduced by a factor of α. If a failure is detected during preventive maintenance, the model selected for corrective maintenance applies with α = αc, otherwise the model selected for preventive maintenance applies with α = αp.

NOTE: the model selected for preventive maintenance may be different from the model selected for corrective maintenance (Mc ≠ Mp).

Weibull-periodic (10-parameter) modeling algorithm
t = 0

n = 0
A
g
e
∗
=
A
g
e
0
 	 
0 ≤ t < T0

A
g
e
(
t
)
=
A
g
e
∗
+
t
 	 
t = T0

n = n + 1
A
g
e
∗
=
Q
(
T
0
)
⋅
[
A
g
e
∗
⋅
(
1
−
α
c
⋅
(
1
−
M
c
)
)
+
T
0
⋅
(
1
−
α
c
)
]
+
(
1
−
Q
(
T
0
)
)
⋅
[
A
g
e
∗
⋅
(
1
−
α
p
⋅
(
1
−
M
p
)
)
+
T
0
⋅
(
1
−
α
p
)
]
Begin loop	 
T0+(n-1)T1 ≤ t < T0+nT1	
A
g
e
(
t
)
=
A
g
e
∗
+
t
−
(
T
0
+
(
n
−
1
)
⋅
T
1
)
 	 
t = T0 + nT1	
n = n + 1
A
g
e
∗
=
Q
(
T
0
+
n
⋅
T
1
)
⋅
[
A
g
e
∗
⋅
(
1
−
α
c
⋅
(
1
−
M
c
)
)
+
T
1
⋅
(
1
−
α
c
)
]
+
(
1
−
Q
(
T
0
+
n
⋅
T
1
)
)
⋅
[
A
g
e
∗
⋅
(
1
−
α
p
⋅
(
1
−
M
p
)
)
+
T
1
⋅
(
1
−
α
p
)
]
Return to beginning of loop	 
WBD / Weibull with detected failures
Model whose failure follows a classical Weibull law and whose repair begins as soon as the failure appears and follows an exponential law with parameter Mu.

Parameters:

Age at t=0 (Time) = Virtual age of the component at the initial time.

Scale parameter (η) (Time) = Failure rate scale parameter

Shape parameter (β) (Factor) = Failure rate shape parameter

Mu = Repair rate

Coefficient applicable to the failure rate (Factor) = Given a coefficient x, multiply the scale parameter by x ^ (- 1 / beta))


General assumptions :

No failure is present at the initial time.

All faults are detected online (i.e. immediately).

Repairs begin as soon as faults appear.

Repairs cause downtime.

There are no other causes of downtime than repairs.

The repairs have no effect on the age of the element.


The definition of the law is as follows:





TPS / Simple Periodic Test law
This law allows a component which fails to be represented according to an exponential distribution law and whose failure is found during a periodic test. The repair is then carried out instantaneously.

Parameters:

Lambda (Rate) = failure rate

Tau (Duration) = test period (time interval between two consecutive tests)

T0 (Time) = date of first test


The law is defined as follows:



Here is a small graph representing the different phases of the component's "life":




Note
This law is a simplified version of the "TPC / Full Periodic Test" law.

TPE / Extended Periodic Test law
This law allows a component which fails to be represented according to an exponential distribution law and whose failure is found during a periodic test. The repair phase is then modelled by an exponential of the Mu parameter.

Parameters:

Lambda (Rate) = failure rate

Mu (Rate) = repair rate (when the failure has been found during a test)

Tau (Duration) = test period (time interval between two consecutive tests)

T0 (Time) = date of first test


Here is a small graph representing the different phases of the component's "life":




Note
This law is a simplified version of the "TPC / Full Periodic Test" law.

TPC / Full Periodic Test law
This law allows a periodically tested component to be represented as completely as possible. There are many parameters in play.

Parameters:

Lambda (Rate) = failure rate during operation or on standby

Lambda* (Rate) = failure rate during the test

Mu (Rate) = repair rate (once the test has shown up the failure)

Tau (Duration) = test period (time interval between two consecutive tests)

Theta (Time) = date of first test (ignore parameter value: Tau)

Gamma (Probability) = probability of failure due to starting the test (ignore parameter value: 0 = starting the test does not cause a failure)

Pi (Duration) = duration of test (ignore parameter value: 0 (instantaneous test))

X = (Boolean) indicator of component availability during the test (0 = component unavailable during the test; 1 = component available) (ignore parameter value: 1 = available during the test)

Sigma (Probability) = test cover rate (probability that the component failure is detected during the test) (ignore parameter value: 1 = the test covers all the possible failures)

Omega 1 ((Probability) = probability of forgetting to reconfigure after the test (ignore parameter value: 0 = no reconfiguration problem)

Omega 2 ((Probability) = probability of forgetting to reconfigure after the repairing (ignore parameter value: 0 = no reconfiguration problem)



Note
the "ignore parameter value" is the value to type if you want parameter to do not affect component availability.

Here is a small graph representing the different phases of the component's "life":



TPC / Full Periodic Test with defined times
This law is the same as the Full Periodic Test law with 11 parameters (see above). The difference is in times of tests. This law does not have Tau or Teta, but there is a Times of tests parameter where you can specify the times the tests will be made.

NRD / No Recovery Before Delay law
This law takes two parameters: a repair rate Mu and a delay Delay. For non repairable components, it gives the probability of not succeeding to recover the component before a delay Delay.


Note
This law does not depend on the time, it is a short version of a constant law.

Parameters:

Mu (Rate) = repair rate

d (Duration) = recovery time


The law is defined as follows:



GLM / GLM Asymptotic law
This law is a variation of the "IND / Unavailability" law. It corresponds to the probability of a "IND / Unavailability" law computed at t = infinity.


Note
This law does not depend on the time, it is a short version of a constant law.

Parameters:

Lambda (Rate) = failure rate

Mu (Rate) = repair rate


The law is defined as follows:



DOR / Dormant
This law has three parameters: a failure rate, a mean repair time and a delay. In addition, it does not depend on the time.

Parameters:

Lambda (Rate) = failure rate

MTTR (Duration) = average repair time

d (Duration) = delay


The law is defined as follows:



CMT / Constant mission time
This law is a simplified case of the "IND / Unavailability" law. It corresponds to an exponential law with a fixed time given as parameter.


Note
This law does not depend on the time, it is a short version of a constant law.



Note
The parameter Q is optional.


Parameters:

Lambda (Rate) = failure rate

T (Duration) = mission time

Q (Probability) = optional law


The law is defined as follows:



EMP / Empiric
This not actually en law, you must enter probability and failure rate in a tableau according to the time.


Warning
If you ask for computation a times which are not in the table, the value will be interpolated according to other points.

MKV / Markov model
This law uses a Markov graph as definition. Select the path of the .jma file. In order to do Boolean computation, you need to do a preprocessing of the law. The preprocessing automatically start Markov module and retrieve necessary values. It can be done with a right-click on the object having the law, or in Data and computations menu.

MKVM / Markov matrix
Description	
This law allows the use of a monophase Markov graph defined according to its transition matrix. Its use does not require precalculations.

This matrix is stochastic :

∀(i,j) Pij >= 0
∀i ∑j Pij = 1

Parameters	
Number of states (n) : Number of matrix states

Transition matrix : n2-size vector of Pij, the probability of moving from i to j
Probability at t=0 : n-size vector of probabilities at t=0 for each state

Availablity : n-size vector of availabilities for each state (0=unavailable, 1=available)

Example	
Consider the following transition matrix:

State 1	State 2	State 3	State 4	State 5	State 6
-	2.1E-5	0	0	0	0
0	-	1.8E-5	0	0	0
0	0	-	1.5E-5	0	0
0	0	0	-	1.2E-5	0
0	0	0	0	-	9E-6
0	0	0	0	0	-

The following probabilities at t=0:

State 1	State 2	State 3	State 4	State 5	State 6
1	0	0	0	0	0

The following availabilities:

State 1	State 2	State 3	State 4	State 5	State 6
1	1	1	1	1	0

The textual syntax to use will be:

markov-matrix(time(),6,
							0,2.1E-5,0,0,0,0,
							0,0,1.8E-5,0,0,0,
							0,0,0,1.5E-5,0,0,
							0,0,0,0,1.2E-5,0,
							0,0,0,0,0,9E-6,
							0,0,0,0,0,0,
							1,0.0,0.0,0.0,0.0,0.0,
							1,1,1,1,1,0.0)

The equivalent markov graph that will be generated will have the following form: 

Textual syntax	
  'markov-matrix' '(' time ',' [expr]nbStates ','
					[expr ',' ... ',' expr]Pij ','
					[expr ',' ... ',' expr]init ','
					[expr ',' ... ',' expr]avail ')'
XML syntax	
   <extern-function name='markov-matrix'>
					time
					[expr]nbStates
					[expr ... expr]Pij
					[expr ... expr]init
					[expr ... expr]avail
					</extern-function>
Redundancy laws
GRIF 2025.1 offers several functions to calculate the reliability and the availability of a set of elements in redundancy m among n. These functions generate a single-phase Markov graph to perform the calculations. The generated transition matrix is accessible using the Transition matrix button displayed below the parameter entry.


The available states are shown in green, the unavailable states in red. By tooltip on the states, we can also display the initial probability of each state.

RA / Active Redundancy
Description	
Albizia offers several functions to calculate the reliability and the availability of a set of elements in redundancy m among n. These functions generate a single-phase Markov graph to perform the calculations (cf. « MKVM / Markov matrix »).

In active redundancy configuration, the n elements are active simultaneously but only m elements are necessary to ensure the mission.

Parameters	
M : Number of functional elements required to perform the function,

N : Total number of items available,

Lambda On (λON) : Element failure rate when the equipment is turned on,

Lambda Off (λOFF) : Failure rate of an element when the equipment is switched off,

Alpha (α) : The use rate α corresponds to the operating time of equipment over the total time of the mission.

Gamma (Γ) : Probability of failure on demand.

Definitions	
λActive = α * λON + (1- α) * λOFF
At t = 0 the probability of being in the nominal state is 1- Γ
At t = 0 the probability of being in the failure state (KO) is Γ
The "System KO" state is a state where the system is unavailable. The system is available in other states.
Transition matrix	

N in operation 0 in fault	N-1 in operation 1 in fault	N-2 in operation 2 in fault	...	M+1 in operation N-M-1 in fault	M in operation N-M in fault	M-1 in operation N-M+1 in fault System KO
N in operation 0 in fault	-	N * λActive	 	 	 	 	 
N-1 in operation 1 in fault	 	-	(N - 1) * λActive	 	 	 	 
N-2 in operation 2 in fault	 	 	-	...	 	 	 
...	 	 	 	-	(M + 2) * λActive	 	 
M+1 in operation N-M-1 in fault	 	 	 	 	-	(M + 1) * λActive	 
M in operation N-M in fault	 	 	 	 	 	-	M * λActive
M-1 in operation N-M+1 in fault Système KO	 	 	 	 	 	 	-

Textual syntax	
  'markov-ra' '(' time ',' [expr]M ',' [expr]N ',' [expr]λON ',' [expr]λOFF ',' [expr]α ',' [expr]Γ ')'
XML syntax	
   <extern-function name='markov-ra'>
					time [expr]M  [expr]N  [expr]λON [expr]λOFF [expr]α [expr]Γ
					</extern-function>
RP / Passive Redundancy
Description	
Albizia offers several functions to calculate the reliability and the availability of a set of elements in redundancy m among n. These functions generate a single-phase Markov graph to perform the calculations (cf. « MKVM / Markov matrix »).

In passive redundancy, the M elements necessary to ensure the function are active simultaneously. The (N-M) elements are activated successively following faults.

Parameters	
M : Number of functional elements required to perform the function,

N : Total number of items available,

Lambda On (λON) : Element failure rate when the equipment is turned on,

Lambda Off (λOFF) : Failure rate of an element when the equipment is switched off,

Alpha (α) : The use rate α corresponds to the operating time of equipment over the total time of the mission.

Gamma (Γ) : Probability of failure on demand.

Definitions	
λ = λActive = α * λON + (1- α) * λOFF
λ* = λOFF
At t = 0 the probability of being in the nominal state is 1 - Γ
At t = 0 the probability of being in the failure state (KO) is Γ
The "System KO" state is a state where the system is unavailable. The system is available in other states.
Transition matrix	

N in operation 0 in fault	N-1 in operation 1 in fault	N-2 in operation 2 in fault	...	M in operation N-M in fault	M-1 in operation N-M+1 in fault System KO
N in operation 0 in fault	-	Mλ+(N-M)λ*	 	 	 	 
N-1 in operation 1 in fault	 	-	Mλ+(N-M-1)λ*	 	 	 
N-2 in operation 2 in fault	 	 	-	Mλ+(N-M-2)λ*	 	 
...	 	 	 	-	Mλ+λ*	 
M in operation N-M in fault	 	 	 	 	-	Mλ
M-1 in operation N-M+1 in fault System KO	 	 	 	 	 	-

Textual syntax	
  'markov-rp' '(' time ',' [expr]M ',' [expr]N ',' [expr]λON ',' [expr]λOFF ',' [expr]α ',' [expr]Γ ')'
XML syntax	
   <extern-function name='markov-rp'>
					time [expr]M  [expr]N  [expr]λON [expr]λOFF [expr]α [expr]Γ
					</extern-function>
RDR / Redundancy with Reconfiguration Duration
Description	
Albizia offers several functions to calculate the reliability and the availability of a set of elements in redundancy m among n. These functions generate a single-phase Markov graph to perform the calculations (cf. « MKVM / Markov matrix »).

This configuration is characterized by an interruption of service in the event of failure of an active element during the entire duration of the Treconf reconfiguration.

Parameters	
M : Number of functional elements required to perform the function,

N : Total number of items available,

Lambda On (λON) : Element failure rate when the equipment is turned on,

Lambda Off (λOFF) : Failure rate of an element when the equipment is switched off,

Alpha (α) : The use rate α corresponds to the operating time of equipment over the total time of the mission.

Gamma (Γ) : Probability of failure on demand.

Reconfiguration delay (Treconf) : Average switching time on one of the redundant elements

Definitions	
λ = λActive = α * λON + (1- α) * λOFF
λ* = λOFF
tr = 1/Treconf
At t = 0 the probability of being in the nominal state is 1- Γ
At t = 0 the probability of being in the failure state (System KO) is Γ
The "System KO" state is a state where the system is unavailable. All "reconfiguration" states are also considered to be states where the system is unavailable. The system is available in other states.
Transition matrix	

 	0	1	2	3	4	...		2(N-M)	2(N-M)+1
No failure : 0	-	Mλ	(N-M)λ*	 	 	 	 	 	 
Reconfiguration : 1	 	-	tr	(M-1)λ+(N-M)λ*	 	 	 	 	 
Loss of 1 element : 2	 	 	-	Mλ	(N-M-1)λ*	 	 	 	 
Reconfiguration : 3	 	 	 	-	tr	 	 	 	 
Loss of 2 elements : 4	 	 	 	 	-	 	 	 	 
...	 	 	 	 	 	 	 	 	 
Reconfiguration : 2(N-M)-1	 	 	 	 	 	 	-	tr	(M-1)λ+λ*
Loss of N-M elements : 2(N-M)	 	 	 	 	 	 	 	-	Mλ
System KO : 2(N-M) +1	 	 	 	 	 	 	 	 	-

Textual syntax	
  'markov-rdr' '(' time ',' [expr]M ',' [expr]N ',' [expr]λON ',' [expr]λOFF ',' [expr]α ',' [expr]Γ ',' [expr]Treconf ')'
XML syntax	
   <extern-function name='markov-rdr'>
					time [expr]M  [expr]N  [expr]λON [expr]λOFF [expr]α [expr]Γ  [expr]Treconf
					</extern-function>
RER / Redundancy of Repairable Elements
Description	
Albizia offers several functions to calculate the reliability and the availability of a set of elements in redundancy m among n. These functions generate a single-phase Markov graph to perform the calculations (cf. « MKVM / Markov matrix »).

This configuration is characterized by the possibility of repairing an element taking into account its MDT. This function considers only one repairer.

Parameters	
M Number of functional elements required to perform the function,

N Total number of items available,

Lambda On (λON) Element failure rate when the equipment is turned on,

Lambda Off (λOFF) Failure rate of an element when the equipment is switched off,

Alpha (α) The use rate α corresponds to the operating time of an equipment over the total time of the mission.

Gamma (Γ) Probability of failure on demand,

MDT (Mean Down Time) Mean down time (detection + repair or standard exchange)

Definitions	
λ = λActive = α * λON + (1- α) * λOFF
λ* = λOFF
μ = 1/MDT
At t = 0 the probability of being in the nominal state is 1 - Γ
At t = 0 the probability of being in the failure state (KO) is Γ
The "System KO" state is a state where the system is unavailable. The system is available in other states.
Transition matrix	

 	0	1	2	...	N-M	N-M+1
No failure : 0	-	Mλ + (N-M)λ*	 	 	 	 
Loss of 1 element : 1	μ	-	Mλ + (N-M-1)λ*	 	 	 
Loss of 2 elements : 2	 	μ	-	 	 	 
...	 	 	 	 	 	 
Loss of N-M elements : N-M	 	 	 	 	-	Mλ
System KO : N-M+1	 	 	 	 	μ	-

Textual syntax	
  'markov-rer' '(' time ',' [expr]M ',' [expr]N ',' [expr]λON ',' [expr]λOFF ',' [expr]α ',' [expr]Γ ',' [expr]MDT ')'
XML syntax	
   <extern-function name='markov-rer'>
					time [expr]M  [expr]N  [expr]λON [expr]λOFF [expr]α [expr]Γ  [expr]MDT
					</extern-function>
RRR / Redundancy Repairable with Reconfiguration Duration
Description	
Albizia offers several functions to calculate the reliability and the availability of a set of elements in redundancy m among n. These functions generate a single-phase Markov graph to perform the calculations (cf. « MKVM / Markov matrix »).

This configuration is characterized by an interruption of the function throughout the duration of the reconfiguration in the event of failure of an active element, considering that the elements are repairable.

Parameters	
M Number of functional elements required to perform the function,

N Total number of items available,

Lambda On (λON) Element failure rate when the equipment is turned on,

Lambda Off (λOFF) Failure rate of an element when the equipment is switched off,

Alpha (α) The use rate α corresponds to the operating time of an equipment over the total time of the mission.

Gamma (Γ) Probability of failure on demand,

Reconfiguration delay (Treconf) : Average switching time on one of the redundant elements

MDT (Mean Down Time) Mean down time (detection + repair or standard exchange)

Definitions	
λ = λActive = α * λON + (1- α) * λOFF
λ* = λOFF
tr = 1/Treconf
μ = 1/MDT
At t = 0 the probability of being in the nominal state is 1 - Γ
At t = 0 the probability of being in the failure state (KO) is Γ
The "System KO" state is a state where the system is unavailable. All "reconfiguration" states are also considered to be states where the system is unavailable. The system is available in other states.
Transition matrix	

 	0	1	2	3	4	...		2(N-M)	2(N-M)+1
No failure : 0	-	Mλ	(N-M)λ*	 	 	 	 	 	 
Reconfiguration : 1	μ	-	tr	(M-1)λ+(N-M)λ*	 	 	 	 	 
Loss of 1 element : 2	μ	 	-	Mλ	(N-M-1)λ*	 	 	 	 
Reconfiguration : 3	 	 	μ	-	tr	 	 	 	 
Loss of 2 elements : 4	 	 	μ	 	-	 	 	 	 
...	 	 	 	 	 	 	 	 	 
Reconfiguration : 2(N-M)-1	 	 	 	 	 	 	-	tr	(M-1)λ+λ*
Loss of N-M elements : 2(N-M)	 	 	 	 	 	 	 	-	Mλ
System KO : 2(N-M) +1	 	 	 	 	 	 	 	μ	-

Textual syntax	
  'markov-rrr' '(' time ',' [expr]M ',' [expr]N ',' [expr]λON ',' [expr]λOFF ',' [expr]α ',' [expr]Γ ',' [expr]Treconf ',' [expr]MDT ')'
XML syntax	
   <extern-function name='markov-rrr'>
					time [expr]M  [expr]N  [expr]λON [expr]λOFF [expr]α [expr]Γ  [expr]Treconf [expr]MDT
					</extern-function>
OCC / Occurrences of failures
The Failure rate is calculated divided the numbers of observed failures by the observation period. The result is a constant law.

Parameters:

Number of failures

Period (Duration) = observation duration


The law is defined as follows:



SIL / SIL level
This law corresponds to a constant law with parameter Q = 1x10-(SIL-Epsilon)


RRF / Risk Reduction Factor
This law corresponds to a constant law with a parameter Risk reduction Factor (RRF)


EXP / Expression
Law is defined buy user with an Albizia expression that contains time(). An Albizia expression can contain several operators and functions (*, +, -, /, gamma(), exp(), sqrt(), min(), pow(), sin(), ...).

Parameters:
Q(t): expression to evaluate Probability (must contained time());

w(t): expression to evaluate unconditional failure rate (must contained time()).

STO / Stored Electrical Component
This law corresponds to a constant law for stored electrical components according to the functioning time and the storage time on the mission time.


The result of the computation will be a constant probability calculated at the end of the mission.

Parameters :

Lambda (rate) = failure rate

Tf (Duration) = yearly functioning time

Ts (Duration) = yearly storage time

K (Rate) = reduction coefficient (functioning failure rate is equal to storage failure divided by this coefficient)

%FMD (Ratio) = failure mode ratio

mission time (Duration) = duration of the mission (in hours) for the component


The law is defined as follows :




Note
Mission time (DM) is taken into account in the computation of total functioning time (TTf) and total storage time (TTs) for the electrical component
TTf is defined as follows :



and TTs is defined as follows :



Assuming the number of hours in a year is set to 8760.

Uncertainties on the parameters
For each probability law used in the model, it is possible to introduce an uncertainty on each of the parameters. There are several laws available to model them:

"UNIF / Uniform";

"NORM / Normal";

"NLOG / Lognormal";

"OBS / Observation";

"OBS (ϴ) / Periodic Observation" ;

"GAM / Gamma";

"BET / Beta";

"TRI / Triangular".

"HST / Histogram".


Using this method, it is thus possible to introduce the impact of the uncertainties on the data into the final result.


UNI / Uniform law
This law has two parameters: and upper limit and a lower limit.

Parameters:

a = upper limit

b = lower limit


The law is defined as follows:



NLOG / Log normal law
This law has 3 parameters: the mean and the error factor and the percentage of confidence interval.

Parameters:

Average(Mu) = The average

Error factor = The error factor EF (= exponential(1.645*Sigma) for a 90% confidence interval)

Confidence interval at = Percent of confidence interval (between 0 and 1)


A random variable is distributed according to a lognormal distribution if its logarithm is distributed according to a normal distribution. The law is defined as follows:


Where Sigma is equal to ln(EF)/coef, where coef is the quantile of the normal law conresponding to the chosen percentage (1.645 for 90%), and where Mu = ln(E(x)) - SigmaÂ²/2

NORM / Normale
This law has two parameters: the mean and the standard deviation.

Parameters:

Mu = mean

Sigma = standard deviation


The law is defined as follows:



OBS / Observation
This law has two parameters.

Parameters:

Number of events (N) = Number of events observed

Observation duration (T) = Observation duration


The probability density function of this distribution is:


k represents the degrees of freedom.

In options, it is possible to choose the degrees of freedom

OBS (ϴ) / Periodique Observation
This law has three parameters, it is based on F.Brissaud work published in Rel. Eng. Sys. Safety 2017 DOI:10.1016/j.ress.2016.11.003

Parameters:

Number failure revealed (N) = Total number of failure observed

Duration between 2 tests (ϴ) = Inspection period

Number of proof tests (W) = Total number od proof tests.


This function is partly based on a random number generator that uses a beta distribution (W-N + 1, N).

GAM / Gamma
The gamma distribution is a two-parameter probability distributions: the shape parameter and the scale parameter.

Parameters:

K = Shape parameter

Theta (θ) = Scale parameter


The probability density of the gamma distribution is:



BET / Beta
The beta distribution is parametrized by two positive shape parameters: Alpha et Beta.

Parameters:

Alpha (α) = Shape parameter

Beta (β) = Shape parameter


The probability density function for 0 ≤ x ≤ 1, and shape parameters α, β > 0 is :



TRI / Triangulaire
This law has three parameters : a minimum, a maximum et an optimum.

Paramètres :

a = minimum

b = maximum

c =optimum


The law definition is:

 :used during Z testing


 :gradient between a and c


 : gradient between c and b


In propagation uncertainties:


Z randomly fired and equidistributed distributed between 0 and 1;





HST / Histogramme
Draw a random number between the minimal bound and the maximal bound, and return value corresponding to the interval containing the value. the law has as many parameters as desired bound.

The law definition is :

Bounds = bound of the value in the histogram.

values = Value between two bounds. the two corresponding bounds are [A;B], where A is the bound located in the row before the current value and B the bound located on the same row of the value. The value on the first row is always empty, since the firts bound is used as the minimal bound of the value on the second row.




Consideration of the uncertainties
Uncertainties on parameters are defined in the tab of parameters.

To do that, first it is necessary to select the column Activate uncertainty and Law using the columns manager.



After, in the tab of parameters, It is enough to choose or not to activate the uncertainties and the law will be applied in Law column.



E. Glossary
Format
All values can be entered in two different ways:

"Normal" notation: the decimal separator is the dot, e.g. 0.0000015.

Scientific notation: the decimal separator is the dot, e.g. 1.5E-6 which corresponds to 0.0000015.


Definition and explanation of the acronyms and parameters

SFF (Safe Failure Fraction): corresponds to the safe failure rate (λsd + λsu + λdd) / λ
Vote with "A" type architecture: the invalidity of the sensor triggers no action other than an alarm (availability). The solver logic is modified, excluding sensors with detected failure. In this case, we define a number (X) of detected failure from which the channel trips. This number (X) is fixed by default for TotalEnergies (but can be modified in M configuration):

3 if 3 components or more
2 if 2 components
1 if 1 component

Vote with "S" type architecture: the invalidity of the sensor triggers the safety system (Safe).

Beta (β): proportion of common cause failures (in %).

CCF or DCC: Common Cause Failure. When several identical elements are put in a system, there is always a probability that they will fail at the same time from a common cause (design problem, external phenomena for example). This is called a common cause failure.

Component available during test (X): specifies whether the component is able to carry out its safety mission during the test (if the checkbox is checked).

DC: on-line diagnostic coverage and is a rate between 0 and 100%. A 0% rate means that no revealed failure can be detected.

DCd: on-line diagnostic coverage of dangerous failures and is a rate between 0 and 100%. A 0% rate means that no revealed dangerous failures can be detected.

DCs: on-line diagnostic coverage of safe failures and is a rate between 0 and 100%. A 0% rate means that no revealed safe failures can be detected.

Detected: applies to the equipment and means detected by diagnostic tests, periodic tests or human intervention (e.g. physical inspection and manual tests) or during normal operation.

DC only alarmed :Percentage of detected failure that are only alarmed (non-triggering). This field is available only if channel is in M Mode.

DCS: Distributed Control System

Determinate: A component can be one of these 3 types: "Non-type A/B", "Type A" or "Type B"

Duration between tests (T1): period of time between two proof tests of the component.

E/E/PE: electrical/electronic/ programmable electronic. Technology based on electricity (E), and/or electronics (E) and/or programmable electronics (EP). NB. - This term designates all devices which work according to electrical principles.

Proportion of detected failure :proportion of hidden failures detected during partial stroking tests (0-100%). 0% means no failure is detected, 100% means every failure is detected.

Failure: a functional unit ceases to accomplish its required function.

Lambda λ: failure rate of the component (h-1).

Lambda D (λ d): dangerous failures. Failure with the potential to put the safety system into a dangerous state or make it unable to carry out its function.

Lambda DU (λ du): Dangerous undetected failure rate of the component (h-1).

Lambda DD (λ dd): Dangerous detected failure rate of the component (h-1).

Lambda S (λ s): safe failures. Failure with the potential to put the safety system into a safe state in carry out its function.

Lambda SU (λ su): Safe undetected failure rate of the component (h-1).

Lambda SD (λ sd): Safe detected failure rate of the component (h-1).

Lambda during test λ*: failure rate of the component during the test (h-1). The test conditions may cause extra stress and increase the lambda.

MDT (in h): indicates the mean time between the occurrence of a failure and the re-start of the system (Mean Down Time). It is the average downtime.

MTTF (in h): indicates the mean time between the start-up of the system and the occurrence of the first failure (Mean Time To Failure). It is the average time of operation before the first failure occurs. λ = 1/ MTTF for a component.

MTTR (Mean Time To Repair) in h: mean time between detection of a failure and the repair of the component.

Non-detected (Undetected): applies to the equipment and means non-detected by diagnostic tests, periodic tests or human intervention (e.g. physical inspection and manual tests) or during normal operation.

Number of tests: number of partial stroking tests carried out between two full tests.

Operating duration (Years): means the foreseen operating industrial duration of the Safety Instrumented Function (SIF) installed on its process unit.

PFD : Probability of Failure on Demand. Cf. Norm IEC61508. Can be defined as Unavailability

PFH : Probability of Failure per Hour. Cf. Norm IEC61508. Can be defined as Unconditionnal Failure Intensity

Redundancy : implementation in parallel of elements which have the same safety function so that the sub-system is more available.

Repair rate μ (Mu): repair rate in -1, whose symbol is (μ). This value is equal to 1/MTTR, for a repair time of 48h, Mu = 1/48 = 2.08E-2

Switch time parameter: is the period of time during which the component causing the failure is disconnected from the system and replaced by a component in working order. This time is necessarily lower than the MMTR.

R.R.F : Risk Reduction Factor of the SIF

Safety function: function to be carried out by an E/E/EP safety system, by a safety system based on another technology or by an external risk reduction device, designed to ensure or maintain the controlled system in a safe state with regard to a specific dangerous event.

SIF : Safety Instrumented Function.

SIL 0: instantaneous PFD ∈ [10-1; 1]. instantaneous PFH ∈ [10-5; +infinity].

SIL 1: instantaneous PFD ∈ [10-2; 10-1[. PFH instantanée ∈ [10-6; 10-5[.

SIL 2: instantaneous PFD ∈ [10-3; 10-2[. instantaneous PFH ∈ [10-7; 10-6[.

SIL 3: instantaneous PFD ∈ [10-4; 10-3[. instantaneous PFH ∈ [10-8; 10-7[.

SIL 4: instantaneous PFD ∈ [0; 10-4[. instantaneous PFH ∈ [0; 10-8[.

SIS: Safety Instrumented System. Instrumented system used to carry out one or several safety functions. An SIS is made up of sensors, a logical processing system and actuators.

System: set of elements which interact according to a specific model, an element, which may be another system called a sub-system. The sub-systems can themselves be either a command system or a controlled system made up of hardware, software and interacting with man.

S-PLC: Safety-Programmable Logic Controller

Test duration π (Pi): period of time necessary for testing the component.

Test efficiency rate σ (Sigma) : cover or efficiency rate of the test. The value ranges from 0 (the test never detects anything) to 1(the test always detects the failure).

Test leads to failureγ (Gamma): probability [0,1] that the test will cause the hardware to fail. 0 means no test causes any failure, 1 mean every test causes failures.

Test when unit is stopped: means that the component is tested when the unit is stopped. The test does not harm the safety function as the unit is no longer working.

Test when unit is working: means that the component is tested when the unit is working. The component is no longer available to carry out its function and this affects the safety function. This can be used when a sensor has been by-passed to be tested and the installation has not been stopped.

Time of the first test (T0): time at which the first test of the component is carried out.

Wrong re-setup after testsω1 (Omega1): probability [0,1] of wrong re-setup of the equipment after the test. It is the probability that the component will not be able to carry out its safety mission after being tested by the operator. It can be left at 0 if you consider that the operators and test procedures are infallible (no omission of a by-passed sensor, powering up the motor, etc.).

Wrong re-setup after repairsω2 (Omega2): probability [0,1] of wrong re-setup of the equipment after the repairs. It is the probability that the component will not be able to carry out its safety mission after being repaired (or changed) by the operator. It can be left at 0 if you consider that the operators and repairs procedures are infallible (powering up the new motor, etc.).